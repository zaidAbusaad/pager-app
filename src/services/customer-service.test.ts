import { beforeEach, describe, expect, it } from "vitest";
import { CLAIM_WINDOW_MS } from "@/domain/claim";
import type { Shop } from "@/domain/shop";
import type { ShopRepository } from "@/repositories/shop-repository";
import { InMemoryOrderRepository } from "@/test-support/in-memory-order-repository";
import { createCustomerService } from "./customer-service";
import { createOrderService } from "./order-service";

const cafe: Shop = { id: "shop-1", name: "Demo Cafe", slug: "demo-cafe" };

const shops: ShopRepository = {
  async findByCashierTokenHash() {
    return null;
  },
  async findBySlug(slug) {
    return slug === cafe.slug ? cafe : null;
  },
  async findById(id) {
    return id === cafe.id ? cafe : null;
  },
};

describe("customer service", () => {
  let repo: InMemoryOrderRepository;
  let now: Date;
  let cashier: ReturnType<typeof createOrderService>;
  let customer: ReturnType<typeof createCustomerService>;

  beforeEach(() => {
    repo = new InMemoryOrderRepository();
    now = new Date("2026-10-26T12:00:00Z");
    repo.clock = () => now;
    cashier = createOrderService({ orders: repo, now: () => now });
    customer = createCustomerService({ shops, orders: repo, now: () => now });
  });

  const minutesLater = (m: number) => {
    now = new Date(now.getTime() + m * 60_000);
  };

  describe("getShop", () => {
    it("finds a shop by its slug", async () => {
      await expect(customer.getShop("demo-cafe")).resolves.toEqual(cafe);
    });

    it("fails with NOT_FOUND for an unknown slug", async () => {
      await expect(customer.getShop("nope")).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });

  describe("claimLatest (counter QR)", () => {
    it("links the phone to the order the cashier just created", async () => {
      const created = await cashier.createOrder("shop-1", 27);
      const { order, shop } = await customer.claimLatest("demo-cafe");
      expect(order.id).toBe(created.id);
      expect(order.number).toBe(27);
      expect(order.claimedAt).toEqual(now);
      expect(shop.name).toBe("Demo Cafe");
    });

    it("hands out the NEWEST waiting order", async () => {
      await cashier.createOrder("shop-1", 27);
      await cashier.createOrder("shop-1", 28);
      const { order } = await customer.claimLatest("demo-cafe");
      expect(order.number).toBe(28);
    });

    it("never gives the same order to two phones", async () => {
      await cashier.createOrder("shop-1", 27);
      await cashier.createOrder("shop-1", 28);
      const first = await customer.claimLatest("demo-cafe");
      const second = await customer.claimLatest("demo-cafe");
      expect(first.order.number).toBe(28);
      expect(second.order.number).toBe(27);
      await expect(customer.claimLatest("demo-cafe")).rejects.toMatchObject({
        code: "NOTHING_TO_CLAIM",
      });
    });

    it("says NOTHING_TO_CLAIM when no order is waiting", async () => {
      await expect(customer.claimLatest("demo-cafe")).rejects.toMatchObject({
        code: "NOTHING_TO_CLAIM",
      });
    });

    it("ignores orders older than the claim window", async () => {
      await cashier.createOrder("shop-1", 27);
      now = new Date(now.getTime() + CLAIM_WINDOW_MS + 1000);
      await expect(customer.claimLatest("demo-cafe")).rejects.toMatchObject({
        code: "NOTHING_TO_CLAIM",
      });
    });

    it("still claims an order just inside the window", async () => {
      await cashier.createOrder("shop-1", 27);
      now = new Date(now.getTime() + CLAIM_WINDOW_MS - 1000);
      const { order } = await customer.claimLatest("demo-cafe");
      expect(order.number).toBe(27);
    });

    it("ignores collected orders", async () => {
      const o = await cashier.createOrder("shop-1", 27);
      await cashier.setStatus("shop-1", o.id, "READY");
      await cashier.setStatus("shop-1", o.id, "DONE");
      await expect(customer.claimLatest("demo-cafe")).rejects.toMatchObject({
        code: "NOTHING_TO_CLAIM",
      });
    });

    it("never takes another shop's order", async () => {
      await cashier.createOrder("shop-2", 5);
      await expect(customer.claimLatest("demo-cafe")).rejects.toMatchObject({
        code: "NOTHING_TO_CLAIM",
      });
    });

    it("fails with NOT_FOUND for an unknown shop", async () => {
      await expect(customer.claimLatest("nope")).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });

  describe("claimByNumber (typed fallback)", () => {
    it("links the phone to that open order, even after the window", async () => {
      await cashier.createOrder("shop-1", 27);
      minutesLater(30);
      const { order } = await customer.claimByNumber("demo-cafe", 27);
      expect(order.number).toBe(27);
      expect(order.claimedAt).not.toBeNull();
    });

    it("fails with NOT_FOUND when no open order has that number", async () => {
      await expect(
        customer.claimByNumber("demo-cafe", 99),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("refuses an order another phone already linked", async () => {
      await cashier.createOrder("shop-1", 27);
      await customer.claimLatest("demo-cafe");
      await expect(
        customer.claimByNumber("demo-cafe", 27),
      ).rejects.toMatchObject({ code: "ALREADY_CLAIMED" });
    });

    it("cannot claim a collected order", async () => {
      const o = await cashier.createOrder("shop-1", 27);
      await cashier.setStatus("shop-1", o.id, "READY");
      await cashier.setStatus("shop-1", o.id, "DONE");
      await expect(
        customer.claimByNumber("demo-cafe", 27),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("release (\"not my order\")", () => {
    it("kills the phone's link and lets the right customer claim it", async () => {
      await cashier.createOrder("shop-1", 27);
      const wrong = await customer.claimLatest("demo-cafe");
      await customer.release(wrong.order.claimToken);

      await expect(
        customer.getOrderStatus(wrong.order.claimToken),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      const right = await customer.claimLatest("demo-cafe");
      expect(right.order.number).toBe(27);
      expect(right.order.claimToken).not.toBe(wrong.order.claimToken);
    });

    it("fails with NOT_FOUND for an unknown token", async () => {
      await expect(customer.release("nope-nope-nope-nope")).rejects.toMatchObject(
        { code: "NOT_FOUND" },
      );
    });

    it("refuses once the order was collected", async () => {
      const o = await cashier.createOrder("shop-1", 27);
      await cashier.setStatus("shop-1", o.id, "READY");
      await cashier.setStatus("shop-1", o.id, "DONE");
      await expect(customer.release(o.claimToken)).rejects.toMatchObject({
        code: "CONFLICT",
      });
    });
  });

  describe("getOrderStatus (by link token)", () => {
    it("returns the order and its shop", async () => {
      const created = await cashier.createOrder("shop-1", 27);
      const { order, shop } = await customer.getOrderStatus(created.claimToken);
      expect(order.number).toBe(27);
      expect(shop.slug).toBe("demo-cafe");
    });

    it("opening the link counts as linking (cashier's per-order QR)", async () => {
      const created = await cashier.createOrder("shop-1", 27);
      expect(created.claimedAt).toBeNull();
      await customer.getOrderStatus(created.claimToken);
      expect((await repo.findById(created.id))?.claimedAt).toEqual(now);
    });

    it("keeps the FIRST link time when polled again later", async () => {
      const created = await cashier.createOrder("shop-1", 27);
      await customer.getOrderStatus(created.claimToken);
      const first = now;
      minutesLater(1);
      await customer.getOrderStatus(created.claimToken);
      expect((await repo.findById(created.id))?.claimedAt).toEqual(first);
    });

    it("an order linked this way is no longer handed out by the counter QR", async () => {
      const created = await cashier.createOrder("shop-1", 27);
      await customer.getOrderStatus(created.claimToken);
      await expect(customer.claimLatest("demo-cafe")).rejects.toMatchObject({
        code: "NOTHING_TO_CLAIM",
      });
    });

    it("shows status changes made by the cashier", async () => {
      const created = await cashier.createOrder("shop-1", 27);
      await cashier.setStatus("shop-1", created.id, "READY");
      const { order } = await customer.getOrderStatus(created.claimToken);
      expect(order.status).toBe("READY");
    });

    it("fails with NOT_FOUND for an unknown token", async () => {
      await expect(
        customer.getOrderStatus("not-a-real-token-123"),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("an old link stops working after the cashier resets it", async () => {
      const created = await cashier.createOrder("shop-1", 27);
      await customer.getOrderStatus(created.claimToken);
      const reset = await cashier.resetClaim("shop-1", created.id);
      await expect(
        customer.getOrderStatus(created.claimToken),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      // ...and the new link works
      const { order } = await customer.getOrderStatus(reset.claimToken);
      expect(order.number).toBe(27);
    });
  });
});
