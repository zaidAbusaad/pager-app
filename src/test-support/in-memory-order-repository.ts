import type { Order, OrderStatus, StatusPatch } from "@/domain/order";
import type {
  ClaimByNumberResult,
  CreateOrderInput,
  CreateOrderResult,
  OrderRepository,
  ReopenResult,
} from "@/repositories/order-repository";

// A fake repository that keeps orders in memory instead of a database.
// It implements the same interface, so services cannot tell the difference.
// Used only by tests.
export class InMemoryOrderRepository implements OrderRepository {
  orders = new Map<string, Order>();
  counters = new Map<string, number>();
  knownShops = new Set<string>(["shop-1", "shop-2"]);
  private sequence = 0;
  // Set to true to simulate "someone else changed the order first".
  loseRace = false;
  // Tests move this clock to control each new order's createdAt.
  clock: () => Date = () => new Date("2026-10-22T10:00:00Z");

  private isTaken(shopId: string, number: number) {
    return [...this.orders.values()].some(
      (o) => o.shopId === shopId && o.number === number && o.status !== "DONE",
    );
  }

  async createForShop({
    shopId,
    claimToken,
    requestedNumber,
  }: CreateOrderInput): Promise<CreateOrderResult> {
    if (!this.knownShops.has(shopId)) return { kind: "shop_not_found" };

    let number: number;
    if (requestedNumber !== undefined) {
      if (this.isTaken(shopId, requestedNumber)) return { kind: "number_taken" };
      number = requestedNumber;
      this.counters.set(shopId, number); // typed number continues the sequence
    } else {
      number = (this.counters.get(shopId) ?? 0) + 1;
      while (this.isTaken(shopId, number)) number += 1;
      this.counters.set(shopId, number);
    }

    const order: Order = {
      id: `order-${++this.sequence}`,
      shopId,
      number,
      status: "PREPARING",
      createdAt: this.clock(),
      readyAt: null,
      doneAt: null,
      claimToken,
      claimedAt: null,
    };
    this.orders.set(order.id, order);
    return { kind: "created", order };
  }

  async peekNextNumber(shopId: string): Promise<number> {
    let number = (this.counters.get(shopId) ?? 0) + 1;
    while (this.isTaken(shopId, number)) number += 1;
    return number;
  }

  async findById(id: string): Promise<Order | null> {
    return this.orders.get(id) ?? null;
  }

  async findByClaimToken(claimToken: string): Promise<Order | null> {
    return (
      [...this.orders.values()].find((o) => o.claimToken === claimToken) ?? null
    );
  }

  async listActiveByShop(shopId: string): Promise<Order[]> {
    return [...this.orders.values()]
      .filter((o) => o.shopId === shopId && o.status !== "DONE")
      .sort((a, b) => a.number - b.number);
  }

  async listRecentDoneByShop(shopId: string, limit: number): Promise<Order[]> {
    return [...this.orders.values()]
      .filter((o) => o.shopId === shopId && o.status === "DONE")
      .sort((a, b) => (b.doneAt?.getTime() ?? 0) - (a.doneAt?.getTime() ?? 0))
      .slice(0, limit);
  }

  async transition(
    id: string,
    from: OrderStatus,
    to: OrderStatus,
    patch: StatusPatch,
  ): Promise<Order | null> {
    const order = this.orders.get(id);
    if (!order || order.status !== from || this.loseRace) return null;
    const updated = { ...order, status: to, ...patch };
    this.orders.set(id, updated);
    return updated;
  }

  async reopenDone(id: string, patch: StatusPatch): Promise<ReopenResult> {
    const order = this.orders.get(id);
    if (!order || order.status !== "DONE") return { kind: "not_done" };
    if (this.isTaken(order.shopId, order.number)) return { kind: "number_taken" };
    const updated = { ...order, status: "READY" as const, ...patch };
    this.orders.set(id, updated);
    return { kind: "reopened", order: updated };
  }

  async deletePreparing(id: string): Promise<boolean> {
    const order = this.orders.get(id);
    if (!order || order.status !== "PREPARING") return false;
    this.orders.delete(id);
    if (this.counters.get(order.shopId) === order.number) {
      this.counters.set(order.shopId, order.number - 1);
    }
    return true;
  }

  async claimLatestForShop(
    shopId: string,
    since: Date,
    now: Date,
  ): Promise<Order | null> {
    // Newest first; for equal times the later-created order wins.
    const newestFirst = [...this.orders.values()].reverse().sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    const candidate = newestFirst.find(
      (o) =>
        o.shopId === shopId &&
        o.claimedAt === null &&
        o.status !== "DONE" &&
        o.createdAt >= since,
    );
    if (!candidate) return null;
    const claimed = { ...candidate, claimedAt: now };
    this.orders.set(claimed.id, claimed);
    return claimed;
  }

  async claimByNumber(
    shopId: string,
    number: number,
    now: Date,
  ): Promise<ClaimByNumberResult> {
    const candidate = [...this.orders.values()].find(
      (o) => o.shopId === shopId && o.number === number && o.status !== "DONE",
    );
    if (!candidate) return { kind: "not_found" };
    if (candidate.claimedAt) return { kind: "already_claimed" };
    const claimed = { ...candidate, claimedAt: now };
    this.orders.set(claimed.id, claimed);
    return { kind: "claimed", order: claimed };
  }

  async markClaimed(orderId: string, now: Date): Promise<void> {
    const order = this.orders.get(orderId);
    if (order && order.claimedAt === null) {
      this.orders.set(orderId, { ...order, claimedAt: now });
    }
  }

  async resetClaim(
    shopId: string,
    orderId: string,
    newClaimToken: string,
  ): Promise<Order | null> {
    const order = this.orders.get(orderId);
    if (!order || order.shopId !== shopId) return null;
    const updated = { ...order, claimToken: newClaimToken, claimedAt: null };
    this.orders.set(orderId, updated);
    return updated;
  }
}
