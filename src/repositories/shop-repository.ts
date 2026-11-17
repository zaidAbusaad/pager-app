import type { Shop, ShopWithOwner } from "@/domain/shop";

export interface ShopRepository {
  // Finds the shop whose cashier link produced this hash, or null. Comes with
  // the owner's subscription date, because the cashier screen needs it.
  findByCashierTokenHash(hash: string): Promise<ShopWithOwner | null>;

  // The slug is the readable shop name in the customer QR link: /s/demo-cafe
  findBySlug(slug: string): Promise<Shop | null>;

  findById(id: string): Promise<Shop | null>;
}
