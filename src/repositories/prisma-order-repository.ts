import type { Order, OrderStatus, StatusPatch } from "@/domain/order";
import { getPrisma } from "@/lib/db";
import type {
  ClaimByNumberResult,
  CreateOrderInput,
  CreateOrderResult,
  OrderRepository,
} from "./order-repository";

const ACTIVE_STATUSES: OrderStatus[] = ["PREPARING", "READY"];

export class PrismaOrderRepository implements OrderRepository {
  async createForShop({
    shopId,
    claimToken,
    requestedNumber,
  }: CreateOrderInput): Promise<CreateOrderResult> {
    // A transaction = several queries that succeed or fail together.
    return getPrisma().$transaction(async (tx): Promise<CreateOrderResult> => {
      // "FOR UPDATE" locks this shop's row until the transaction ends. Anyone
      // else creating an order for the same shop waits here, one at a time,
      // so two cashiers can never grab the same number.
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "Shop" WHERE "id" = ${shopId} FOR UPDATE
      `;
      if (locked.length === 0) return { kind: "shop_not_found" };

      const isTaken = async (number: number) =>
        (await tx.order.findFirst({
          where: { shopId, number, status: { in: ACTIVE_STATUSES } },
          select: { id: true },
        })) !== null;

      let number: number;
      if (requestedNumber !== undefined) {
        if (await isTaken(requestedNumber)) return { kind: "number_taken" };
        number = requestedNumber;
      } else {
        const shop = await tx.shop.findUniqueOrThrow({
          where: { id: shopId },
          select: { lastOrderNumber: true },
        });
        number = shop.lastOrderNumber + 1;
        while (await isTaken(number)) number += 1; // skip numbers typed by hand
        await tx.shop.update({
          where: { id: shopId },
          data: { lastOrderNumber: number },
        });
      }

      const order = await tx.order.create({
        data: { shopId, number, claimToken },
      });
      return { kind: "created", order };
    });
  }

  findById(id: string): Promise<Order | null> {
    return getPrisma().order.findUnique({ where: { id } });
  }

  findByClaimToken(claimToken: string): Promise<Order | null> {
    return getPrisma().order.findUnique({ where: { claimToken } });
  }

  listActiveByShop(shopId: string): Promise<Order[]> {
    return getPrisma().order.findMany({
      where: { shopId, status: { in: ACTIVE_STATUSES } },
      orderBy: { number: "asc" },
    });
  }

  listRecentDoneByShop(shopId: string, limit: number): Promise<Order[]> {
    return getPrisma().order.findMany({
      where: { shopId, status: "DONE" },
      orderBy: { doneAt: "desc" },
      take: limit,
    });
  }

  async transition(
    id: string,
    from: OrderStatus,
    to: OrderStatus,
    patch: StatusPatch,
  ): Promise<Order | null> {
    const prisma = getPrisma();
    // "where status = from" makes this a compare-and-set: if another request
    // changed the order a moment ago, zero rows match and we report that.
    const result = await prisma.order.updateMany({
      where: { id, status: from },
      data: { status: to, ...patch },
    });
    if (result.count === 0) return null;
    return prisma.order.findUnique({ where: { id } });
  }

  async claimLatestForShop(
    shopId: string,
    since: Date,
    now: Date,
  ): Promise<Order | null> {
    const prisma = getPrisma();
    // Find-then-claim with a compare-and-set: "claimedAt: null" in the update
    // means only ONE of two simultaneous scans can win a given order. The loser
    // simply looks again and takes the next candidate (or gets nothing).
    for (let attempt = 0; attempt < 3; attempt++) {
      const candidate = await prisma.order.findFirst({
        where: {
          shopId,
          claimedAt: null,
          status: { in: ACTIVE_STATUSES },
          createdAt: { gte: since },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: { id: true },
      });
      if (!candidate) return null;

      const won = await prisma.order.updateMany({
        where: { id: candidate.id, claimedAt: null },
        data: { claimedAt: now },
      });
      if (won.count === 1) {
        return prisma.order.findUnique({ where: { id: candidate.id } });
      }
    }
    return null;
  }

  async claimByNumber(
    shopId: string,
    number: number,
    now: Date,
  ): Promise<ClaimByNumberResult> {
    const prisma = getPrisma();
    const candidate = await prisma.order.findFirst({
      where: { shopId, number, status: { in: ACTIVE_STATUSES } },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (!candidate) return { kind: "not_found" };

    const won = await prisma.order.updateMany({
      where: { id: candidate.id, claimedAt: null },
      data: { claimedAt: now },
    });
    if (won.count === 0) return { kind: "already_claimed" };

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: candidate.id },
    });
    return { kind: "claimed", order };
  }

  async markClaimed(orderId: string, now: Date): Promise<void> {
    await getPrisma().order.updateMany({
      where: { id: orderId, claimedAt: null },
      data: { claimedAt: now },
    });
  }

  async resetClaim(
    shopId: string,
    orderId: string,
    newClaimToken: string,
  ): Promise<Order | null> {
    const prisma = getPrisma();
    // "shopId" in the filter keeps one shop from resetting another's order.
    const result = await prisma.order.updateMany({
      where: { id: orderId, shopId },
      data: { claimToken: newClaimToken, claimedAt: null },
    });
    if (result.count === 0) return null;
    return prisma.order.findUnique({ where: { id: orderId } });
  }
}
