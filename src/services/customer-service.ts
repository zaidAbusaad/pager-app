import { claimWindowStart, generateClaimToken } from "@/domain/claim";
import { DomainError } from "@/domain/errors";
import type { Order } from "@/domain/order";
import type { Shop } from "@/domain/shop";
import type { OrderRepository } from "@/repositories/order-repository";
import type { ShopRepository } from "@/repositories/shop-repository";

interface Dependencies {
  shops: ShopRepository;
  orders: OrderRepository;
  now?: () => Date; // injectable so tests control the clock
}

// What a customer (anyone holding the QR code) may do. There is no login, so
// this service only exposes what is safe for the public. Note what is NOT
// here: a customer can never create an order or change its status. Orders are
// created by the cashier; the customer's phone only LINKS to one.
export function createCustomerService({
  shops,
  orders,
  now = () => new Date(),
}: Dependencies) {
  async function requireShopBySlug(slug: string): Promise<Shop> {
    const shop = await shops.findBySlug(slug);
    if (!shop) throw new DomainError("NOT_FOUND", "Shop not found", {
      reason: "SHOP_NOT_FOUND",
    });
    return shop;
  }

  return {
    getShop: requireShopBySlug,

    // Counter QR scanned: link the phone to the newest order the cashier
    // created in the last couple of minutes that nobody has linked yet.
    async claimLatest(slug: string): Promise<{ order: Order; shop: Shop }> {
      const shop = await requireShopBySlug(slug);
      const current = now();
      const order = await orders.claimLatestForShop(
        shop.id,
        claimWindowStart(current),
        current,
      );
      if (!order) {
        throw new DomainError(
          "NOTHING_TO_CLAIM",
          "No order is waiting. Ask the cashier to enter your order first.",
        );
      }
      return { order, shop };
    },

    // Fallback: the customer types the number the cashier told them.
    async claimByNumber(
      slug: string,
      number: number,
    ): Promise<{ order: Order; shop: Shop }> {
      const shop = await requireShopBySlug(slug);
      const result = await orders.claimByNumber(shop.id, number, now());
      switch (result.kind) {
        case "claimed":
          return { order: result.order, shop };
        case "not_found":
          throw new DomainError(
            "NOT_FOUND",
            `There is no open order #${number}.`,
            { reason: "NO_OPEN_ORDER", number },
          );
        case "already_claimed":
          throw new DomainError(
            "ALREADY_CLAIMED",
            `Order #${number} is already linked to another phone. Ask the cashier for your QR.`,
            { number },
          );
      }
    },

    // The tracking page asks this every few seconds. Opening the link
    // (for example from the cashier's per-order QR) also counts as linking.
    async getOrderStatus(
      claimToken: string,
    ): Promise<{ order: Order; shop: Shop }> {
      let order = await orders.findByClaimToken(claimToken);
      if (!order) throw new DomainError("NOT_FOUND", "Order not found", {
        reason: "ORDER_NOT_FOUND",
      });
      const shop = await shops.findById(order.shopId);
      if (!shop) throw new DomainError("NOT_FOUND", "Order not found", {
        reason: "ORDER_NOT_FOUND",
      });

      if (order.claimedAt === null) {
        const at = now();
        await orders.markClaimed(order.id, at);
        order = { ...order, claimedAt: at };
      }
      return { order, shop };
    },

    // "Not my order": the customer's phone let go of an order it linked by
    // mistake (for example the person in front's order). The order gets a new
    // secret, so this phone's link dies, and the right customer can claim it.
    async release(claimToken: string): Promise<void> {
      const order = await orders.findByClaimToken(claimToken);
      if (!order) throw new DomainError("NOT_FOUND", "Order not found", {
        reason: "ORDER_NOT_FOUND",
      });
      if (order.status === "CANCELLED") {
        throw new DomainError("NOT_FOUND", "Order not found", {
          reason: "ORDER_NOT_FOUND",
        });
      }
      if (order.status === "DONE") {
        throw new DomainError("CONFLICT", "This order was already collected.", {
          reason: "ALREADY_COLLECTED",
        });
      }
      await orders.resetClaim(order.shopId, order.id, generateClaimToken());
    },
  };
}

export type CustomerService = ReturnType<typeof createCustomerService>;
