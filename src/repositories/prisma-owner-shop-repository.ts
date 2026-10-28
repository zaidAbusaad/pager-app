import { Prisma } from "@/generated/prisma/client";
import type { Shop } from "@/domain/shop";
import { getPrisma } from "@/lib/db";
import type { CreateShopResult, OwnerShopRepository } from "./owner-shop-repository";

const FIELDS = { id: true, name: true, slug: true } as const;

export class PrismaOwnerShopRepository implements OwnerShopRepository {
  countByOwner(ownerId: string): Promise<number> {
    return getPrisma().shop.count({ where: { ownerId } });
  }

  listByOwner(ownerId: string): Promise<Shop[]> {
    return getPrisma().shop.findMany({
      where: { ownerId },
      select: FIELDS,
      orderBy: { createdAt: "asc" },
    });
  }

  async create(input: {
    ownerId: string;
    name: string;
    slug: string;
    cashierTokenHash: string;
  }): Promise<CreateShopResult> {
    try {
      const shop = await getPrisma().shop.create({ data: input, select: FIELDS });
      return { kind: "created", shop };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return { kind: "slug_taken" };
      }
      throw error;
    }
  }

  async replaceCashierTokenHash(
    ownerId: string,
    shopId: string,
    cashierTokenHash: string,
  ): Promise<boolean> {
    // updateMany with BOTH id and ownerId in the filter: it matches nothing
    // (count 0) when the shop belongs to someone else.
    const { count } = await getPrisma().shop.updateMany({
      where: { id: shopId, ownerId },
      data: { cashierTokenHash },
    });
    return count > 0;
  }
}
