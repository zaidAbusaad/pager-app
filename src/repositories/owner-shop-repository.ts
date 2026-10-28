import type { Shop } from "@/domain/shop";

export type CreateShopResult =
  | { kind: "created"; shop: Shop }
  | { kind: "slug_taken" };

// Shop operations done by a logged-in owner. Every method takes the ownerId
// and only touches that owner's shops, so one owner can never see or change
// another owner's branch.
export interface OwnerShopRepository {
  countByOwner(ownerId: string): Promise<number>;
  listByOwner(ownerId: string): Promise<Shop[]>;
  create(input: {
    ownerId: string;
    name: string;
    slug: string;
    cashierTokenHash: string;
  }): Promise<CreateShopResult>;
  // Replaces the cashier link's hash. False when the shop is not this owner's.
  replaceCashierTokenHash(
    ownerId: string,
    shopId: string,
    cashierTokenHash: string,
  ): Promise<boolean>;
}
