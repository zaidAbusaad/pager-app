import { generateClaimToken } from "@/domain/claim";
import { DomainError } from "@/domain/errors";
import {
  assertCanTransition,
  statusPatch,
  type Order,
  type OrderStatus,
} from "@/domain/order";
import type { OrderRepository } from "@/repositories/order-repository";

interface Dependencies {
  orders: OrderRepository;
  now?: () => Date; // injectable so tests control the clock
}

// How many collected orders the cashier's "Collected" tab remembers.
const RECENT_DONE_LIMIT = 30;

// A factory function: it receives what it depends on instead of importing it.
// That is "dependency injection", and it is what makes this easy to test.
export function createOrderService({
  orders,
  now = () => new Date(),
}: Dependencies) {
  return {
    // `requestedNumber` is optional: leave it out for the next automatic number.
    async createOrder(
      shopId: string,
      requestedNumber?: number,
    ): Promise<Order> {
      const result = await orders.createForShop({
        shopId,
        claimToken: generateClaimToken(),
        requestedNumber,
      });
      switch (result.kind) {
        case "created":
          return result.order;
        case "shop_not_found":
          throw new DomainError("NOT_FOUND", "Shop not found");
        case "number_taken":
          throw new DomainError(
            "CONFLICT",
            `Number #${requestedNumber} is already in use by another order`,
          );
      }
    },

    // Everything the cashier screen needs: unfinished orders first,
    // then the most recently collected ones.
    async listBoard(shopId: string): Promise<Order[]> {
      const [active, done] = await Promise.all([
        orders.listActiveByShop(shopId),
        orders.listRecentDoneByShop(shopId, RECENT_DONE_LIMIT),
      ]);
      return [...active, ...done];
    },

    // Cashier "reset link": the order gets a new secret, so whoever held the
    // old link (a wrong person, a lost phone) is cut off, and the order can be
    // linked again by a new scan.
    async resetClaim(shopId: string, orderId: string): Promise<Order> {
      const order = await orders.resetClaim(
        shopId,
        orderId,
        generateClaimToken(),
      );
      if (!order) throw new DomainError("NOT_FOUND", "Order not found");
      return order;
    },

    // Moves one of THIS shop's orders to a new status (ready, collected, undo).
    async setStatus(
      shopId: string,
      orderId: string,
      to: OrderStatus,
    ): Promise<Order> {
      const current = await orders.findById(orderId);

      // An order from another shop looks exactly like a missing one,
      // so a cashier can never discover or touch other shops' orders.
      if (!current || current.shopId !== shopId) {
        throw new DomainError("NOT_FOUND", "Order not found");
      }

      // Idempotent: a double-tap is not an error, nothing changes.
      if (current.status === to) return current;

      assertCanTransition(current.status, to);

      const updated = await orders.transition(
        orderId,
        current.status,
        to,
        statusPatch(to, now()),
      );
      if (!updated) {
        throw new DomainError(
          "CONFLICT",
          "The order was changed by someone else. Please retry.",
        );
      }
      return updated;
    },
  };
}

export type OrderService = ReturnType<typeof createOrderService>;
