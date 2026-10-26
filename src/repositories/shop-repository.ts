import type { Shop } from "@/domain/shop";

export interface ShopRepository {
  // Finds the shop whose cashier link produced this hash, or null.
  findByCashierTokenHash(hash: string): Promise<Shop | null>;

  // The slug is the readable shop name in the customer QR link: /s/demo-cafe
  findBySlug(slug: string): Promise<Shop | null>;

  findById(id: string): Promise<Shop | null>;
}
