import { randomBytes } from "node:crypto";
import { generateCashierToken } from "@/domain/cashier-token";
import { DomainError } from "@/domain/errors";
import {
  MAX_BRANCHES_PER_OWNER,
  type Shop,
  isValidShopName,
  normalizeShopName,
  slugify,
} from "@/domain/shop";
import type { OwnerShopRepository } from "@/repositories/owner-shop-repository";

const SLUG_ATTEMPTS = 6;

interface Deps {
  shops: OwnerShopRepository;
  // Four random letters/digits for slugs that need to be made unique.
  suffix?: () => string;
}

export function createBranchService({
  shops,
  suffix = () => randomBytes(3).toString("hex").slice(0, 4),
}: Deps) {
  return {
    listBranches(ownerId: string): Promise<Shop[]> {
      return shops.listByOwner(ownerId);
    },

    // Creates a branch and its cashier link. The link's secret is returned
    // ONCE here; only its hash is stored, so it cannot be shown again
    // (the owner can make a new one with rotateCashierLink).
    async createBranch(ownerId: string, input: { name: string }) {
      const name = normalizeShopName(input.name);
      if (!isValidShopName(name)) {
        throw new DomainError("INVALID_INPUT", "Invalid branch name", { reason: "INVALID_NAME" });
      }
      if ((await shops.countByOwner(ownerId)) >= MAX_BRANCHES_PER_OWNER) {
        throw new DomainError("CONFLICT", "Branch limit reached", { reason: "TOO_MANY_BRANCHES" });
      }

      const base = slugify(name);
      const { token, hash } = generateCashierToken();
      for (let attempt = 0; attempt < SLUG_ATTEMPTS; attempt++) {
        // First try the clean slug; if it is taken (or empty, as for Arabic
        // names), add a short random suffix and try again.
        const slug =
          attempt === 0 && base ? base : `${base || "shop"}-${suffix()}`;
        const result = await shops.create({
          ownerId,
          name,
          slug,
          cashierTokenHash: hash,
        });
        if (result.kind === "created") return { shop: result.shop, cashierToken: token };
      }
      throw new DomainError("CONFLICT", "Could not pick a unique address", {
        reason: "SLUG_UNAVAILABLE",
      });
    },

    // Replaces the cashier link (for example, a staff member left). The old
    // link stops working immediately.
    async rotateCashierLink(ownerId: string, shopId: string) {
      const { token, hash } = generateCashierToken();
      const ok = await shops.replaceCashierTokenHash(ownerId, shopId, hash);
      if (!ok) {
        throw new DomainError("NOT_FOUND", "Branch not found", { reason: "BRANCH_NOT_FOUND" });
      }
      return { cashierToken: token };
    },
  };
}

export type BranchService = ReturnType<typeof createBranchService>;
