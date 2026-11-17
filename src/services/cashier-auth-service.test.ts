import { describe, expect, it } from "vitest";
import { hashCashierToken } from "@/domain/cashier-token";
import type { Shop, ShopWithOwner } from "@/domain/shop";
import type { ShopRepository } from "@/repositories/shop-repository";
import { createCashierAuthService } from "./cashier-auth-service";

const SECRET = "the-secret-in-the-link";
const shop: Shop = { id: "shop-1", name: "Demo Cafe", slug: "demo-cafe" };
const now = new Date("2026-11-17T12:00:00Z");
const day = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

// Fake database: knows exactly one shop, stored by the HASH of its secret,
// owned by someone whose subscription ends at `activeUntil` (or has no owner).
function fakeShops(owner: ShopWithOwner["owner"]): ShopRepository {
  return {
    async findByCashierTokenHash(hash) {
      return hash === hashCashierToken(SECRET) ? { ...shop, owner } : null;
    },
    async findBySlug() {
      return null;
    },
    async findById() {
      return null;
    },
  };
}

function authFor(owner: ShopWithOwner["owner"]) {
  return createCashierAuthService({ shops: fakeShops(owner), now: () => now });
}

describe("cashier auth service", () => {
  const auth = authFor({ activeUntil: day(10) });

  it("returns the shop for a valid token (without the owner details)", async () => {
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

describe("cashier auth service and subscriptions", () => {
  it("lets an account that is in its grace period keep working", async () => {
    await expect(authFor({ activeUntil: day(-1) }).authenticate(SECRET)).resolves.toEqual(shop);
  });

  it("blocks an account that was never activated", async () => {
    await expect(authFor({ activeUntil: null }).authenticate(SECRET)).rejects.toMatchObject({
      code: "SUBSCRIPTION_INACTIVE",
    });
  });

  it("blocks an account once the grace period is over", async () => {
    await expect(authFor({ activeUntil: day(-4) }).authenticate(SECRET)).rejects.toMatchObject({
      code: "SUBSCRIPTION_INACTIVE",
    });
  });

  it("never blocks a shop that has no owner (the demo shop)", async () => {
    await expect(authFor(null).authenticate(SECRET)).resolves.toEqual(shop);
  });

  it("still treats a wrong token as unauthorized, not as inactive", async () => {
    await expect(authFor({ activeUntil: null }).authenticate("wrong")).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
