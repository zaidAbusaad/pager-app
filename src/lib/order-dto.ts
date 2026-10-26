import type { Order } from "@/domain/order";

// DTO = Data Transfer Object: the exact shape we send to clients.
// We pick fields on purpose so database changes never leak out by accident.
export function toOrderDto(order: Order) {
  return {
    id: order.id,
    shopId: order.shopId,
    number: order.number,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    readyAt: order.readyAt?.toISOString() ?? null,
    doneAt: order.doneAt?.toISOString() ?? null,
    // The cashier may show this order's QR: /o/<claimToken>
    claimToken: order.claimToken,
    claimed: order.claimedAt !== null,
  };
}

// What a customer's phone receives. Deliberately smaller than the cashier DTO:
// no internal shop id, no timestamps it does not need.
export function toPublicOrderDto(
  order: Order,
  shop: { name: string; slug: string },
) {
  return {
    token: order.claimToken,
    number: order.number,
    status: order.status,
    readyAt: order.readyAt?.toISOString() ?? null,
    shopName: shop.name,
    shopSlug: shop.slug,
  };
}
