import { beforeEach, describe, expect, it } from "vitest";
import { DomainError } from "@/domain/errors";
import { InMemoryOrderRepository } from "@/test-support/in-memory-order-repository";
import { createOrderService } from "./order-service";

describe("order service", () => {
  let repo: InMemoryOrderRepository;
  let service: ReturnType<typeof createOrderService>;
  let clock: Date;

  beforeEach(() => {
    repo = new InMemoryOrderRepository();
    clock = new Date("2026-10-22T12:00:00Z");
    service = createOrderService({ orders: repo, now: () => clock });
  });

  describe("createOrder", () => {
    it("creates a PREPARING order with the next number", async () => {
      const first = await service.createOrder("shop-1");
      const second = await service.createOrder("shop-1");
      expect(first).toMatchObject({ number: 1, status: "PREPARING" });
      expect(second.number).toBe(2);
    });

    it("numbers each shop separately", async () => {
      await service.createOrder("shop-1");
      const other = await service.createOrder("shop-2");
      expect(other.number).toBe(1);
    });

    it("fails with NOT_FOUND for an unknown shop", async () => {
      await expect(service.createOrder("nope")).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    describe("with a number chosen by the cashier", () => {
      it("uses exactly that number", async () => {
        const order = await service.createOrder("shop-1", 27);
        expect(order.number).toBe(27);
      });

      it("refuses a number already used by an unfinished order", async () => {
        await service.createOrder("shop-1", 27);
        const attempt = service.createOrder("shop-1", 27);
        await expect(attempt).rejects.toMatchObject({ code: "CONFLICT" });
        await expect(attempt).rejects.toThrow("#27");
      });

      it("allows the same number in a different shop", async () => {
        await service.createOrder("shop-1", 27);
        const other = await service.createOrder("shop-2", 27);
        expect(other.number).toBe(27);
      });

      it("allows reusing a number once its order was collected", async () => {
        const first = await service.createOrder("shop-1", 27);
        await service.setStatus("shop-1", first.id, "READY");
        await service.setStatus("shop-1", first.id, "DONE");
        const again = await service.createOrder("shop-1", 27);
        expect(again.number).toBe(27);
        expect(again.id).not.toBe(first.id);
      });

      it("makes the automatic counter skip numbers that are taken", async () => {
        await service.createOrder("shop-1", 2); // typed by hand
        const a = await service.createOrder("shop-1"); // -> 1
        const b = await service.createOrder("shop-1"); // 2 is taken -> 3
        expect([a.number, b.number]).toEqual([1, 3]);
      });
    });
  });

  describe("listBoard", () => {
    it("returns unfinished orders by number, then collected ones newest first", async () => {
      const a = await service.createOrder("shop-1");
      const b = await service.createOrder("shop-1");
      const c = await service.createOrder("shop-1");
      await service.createOrder("shop-2"); // another shop, must not appear

      await service.setStatus("shop-1", a.id, "READY");
      await service.setStatus("shop-1", a.id, "DONE"); // collected first
      clock = new Date("2026-10-22T12:05:00Z");
      await service.setStatus("shop-1", c.id, "READY");
      await service.setStatus("shop-1", c.id, "DONE"); // collected later

      const board = await service.listBoard("shop-1");
      expect(board.map((o) => o.id)).toEqual([b.id, c.id, a.id]);
    });
  });

  describe("setStatus", () => {
    it("moves the order to READY and stamps readyAt", async () => {
      const order = await service.createOrder("shop-1");
      const ready = await service.setStatus("shop-1", order.id, "READY");
      expect(ready.status).toBe("READY");
      expect(ready.readyAt).toEqual(clock);
    });

    it("moves READY to DONE and stamps doneAt", async () => {
      const order = await service.createOrder("shop-1");
      await service.setStatus("shop-1", order.id, "READY");
      const done = await service.setStatus("shop-1", order.id, "DONE");
      expect(done.status).toBe("DONE");
      expect(done.doneAt).toEqual(clock);
    });

    it("undoes a mistaken READY and clears readyAt", async () => {
      const order = await service.createOrder("shop-1");
      await service.setStatus("shop-1", order.id, "READY");
      const undone = await service.setStatus("shop-1", order.id, "PREPARING");
      expect(undone.status).toBe("PREPARING");
      expect(undone.readyAt).toBeNull();
    });

    it("is idempotent: a second tap changes nothing and does not fail", async () => {
      const order = await service.createOrder("shop-1");
      await service.setStatus("shop-1", order.id, "READY");
      const again = await service.setStatus("shop-1", order.id, "READY");
      expect(again.status).toBe("READY");
    });

    it("fails with NOT_FOUND for an unknown order", async () => {
      await expect(
        service.setStatus("shop-1", "missing", "READY"),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("cannot touch another shop's order: looks like NOT_FOUND", async () => {
      const theirs = await service.createOrder("shop-2");
      await expect(
        service.setStatus("shop-1", theirs.id, "READY"),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      // and it really was not changed:
      expect((await repo.findById(theirs.id))?.status).toBe("PREPARING");
    });

    it("refuses to skip READY (PREPARING -> DONE)", async () => {
      const order = await service.createOrder("shop-1");
      await expect(
        service.setStatus("shop-1", order.id, "DONE"),
      ).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    });

    it("refuses to reopen a DONE order", async () => {
      const order = await service.createOrder("shop-1");
      await service.setStatus("shop-1", order.id, "READY");
      await service.setStatus("shop-1", order.id, "DONE");
      await expect(
        service.setStatus("shop-1", order.id, "READY"),
      ).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    });

    it("reports CONFLICT if the order changed while we were updating", async () => {
      const order = await service.createOrder("shop-1");
      repo.loseRace = true;
      const attempt = service.setStatus("shop-1", order.id, "READY");
      await expect(attempt).rejects.toBeInstanceOf(DomainError);
      await expect(attempt).rejects.toMatchObject({ code: "CONFLICT" });
    });
  });

  describe("claim links", () => {
    it("gives every order its own unguessable token, not yet linked", async () => {
      const a = await service.createOrder("shop-1");
      const b = await service.createOrder("shop-1");
      expect(a.claimToken).toMatch(/^[A-Za-z0-9_-]{22}$/);
      expect(a.claimToken).not.toBe(b.claimToken);
      expect(a.claimedAt).toBeNull();
    });

    it("resetClaim issues a new token and unlinks the phone", async () => {
      const order = await service.createOrder("shop-1");
      await repo.markClaimed(order.id, clock);
      const reset = await service.resetClaim("shop-1", order.id);
      expect(reset.claimToken).not.toBe(order.claimToken);
      expect(reset.claimedAt).toBeNull();
      // the old link no longer finds the order
      expect(await repo.findByClaimToken(order.claimToken)).toBeNull();
    });

    it("resetClaim cannot touch another shop's order", async () => {
      const theirs = await service.createOrder("shop-2");
      await expect(
        service.resetClaim("shop-1", theirs.id),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      expect((await repo.findById(theirs.id))?.claimToken).toBe(
        theirs.claimToken,
      );
    });
  });
});
