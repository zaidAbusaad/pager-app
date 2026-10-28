import type { Shop } from "@/domain/shop";
import type { CreateShopResult, OwnerShopRepository } from "@/repositories/owner-shop-repository";

// In-memory fake used only by tests.
export class InMemoryOwnerShopRepository implements OwnerShopRepository {
  rows: (Shop & { ownerId: string; cashierTokenHash: string })[] = [];
  private sequence = 0;

  async countByOwner(ownerId: string) {
    return this.rows.filter((r) => r.ownerId === ownerId).length;
  }

  async listByOwner(ownerId: string) {
    return this.rows
      .filter((r) => r.ownerId === ownerId)
      .map(({ id, name, slug }) => ({ id, name, slug }));
  }

  async create(input: {
    ownerId: string;
    name: string;
    slug: string;
    cashierTokenHash: string;
  }): Promise<CreateShopResult> {
    if (this.rows.some((r) => r.slug === input.slug)) return { kind: "slug_taken" };
    const row = { id: `shop-${++this.sequence}`, ...input };
    this.rows.push(row);
    return { kind: "created", shop: { id: row.id, name: row.name, slug: row.slug } };
  }

  async replaceCashierTokenHash(ownerId: string, shopId: string, hash: string) {
    const row = this.rows.find((r) => r.id === shopId && r.ownerId === ownerId);
    if (!row) return false;
    row.cashierTokenHash = hash;
    return true;
  }
}
