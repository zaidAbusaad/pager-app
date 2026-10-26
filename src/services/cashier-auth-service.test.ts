import { describe, expect, it } from "vitest";
import { hashCashierToken } from "@/domain/cashier-token";
import type { Shop } from "@/domain/shop";
import type { ShopRepository } from "@/repositories/shop-repository";
import { createCashierAuthService } from "./cashier-auth-service";

const SECRET = "the-secret-in-the-link";
const shop: Shop = { id: "shop-1", name: "Demo Cafe", slug: "demo-cafe" };

// Fake database: knows exactly one shop, stored by the HASH of its secret.
const shops: ShopRepository = {
  async findByCashierTokenHash(hash) {
    return hash === hashCashierToken(SECRET) ? shop : null;
  },
  async findBySlug() {
    return null;
  },
  async findById() {
    return null;
  },
};

describe("cashier auth service", () => {
  const auth = createCashierAuthService({ shops });

  it("returns the shop for a valid token", async () => {
    await expect(auth.authenticate(SECRET)).resolves.toEqual(shop);
  });

  it.each([null, undefined, ""])("rejects a missing token (%s)", async (t) => {
    await expect(auth.authenticate(t)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects a wrong token", async () => {
    await expect(auth.authenticate("wrong")).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects an absurdly long token without hitting the database", async () => {
    await expect(auth.authenticate("x".repeat(5000))).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
