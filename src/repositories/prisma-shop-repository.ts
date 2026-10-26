import type { Shop } from "@/domain/shop";
import { getPrisma } from "@/lib/db";
import type { ShopRepository } from "./shop-repository";

// Only these columns ever leave the database layer. Notably NOT the
// cashierTokenHash, so it cannot leak into a response by accident.
const PUBLIC_FIELDS = { id: true, name: true, slug: true } as const;

export class PrismaShopRepository implements ShopRepository {
  findByCashierTokenHash(hash: string): Promise<Shop | null> {
    return getPrisma().shop.findUnique({
      where: { cashierTokenHash: hash },
      select: PUBLIC_FIELDS,
    });
  }

  findBySlug(slug: string): Promise<Shop | null> {
    return getPrisma().shop.findUnique({
      where: { slug },
      select: PUBLIC_FIELDS,
    });
  }

  findById(id: string): Promise<Shop | null> {
    return getPrisma().shop.findUnique({
      where: { id },
      select: PUBLIC_FIELDS,
    });
  }
}
