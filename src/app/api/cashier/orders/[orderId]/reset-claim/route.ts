import type { NextRequest } from "next/server";
import { handle } from "@/lib/http";
import { toOrderDto } from "@/lib/order-dto";
import { orderService } from "@/server/container";
import { requireCashier } from "@/server/require-cashier";
import { orderParams } from "@/validation/order-schemas";

// POST /api/cashier/orders/:orderId/reset-claim
// Cuts off whoever is linked to this order (new secret, unclaimed again).
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/cashier/orders/[orderId]/reset-claim">,
) {
  return handle(async () => {
    const shop = await requireCashier(request);
    const { orderId } = orderParams.parse(await ctx.params);
    const order = await orderService.resetClaim(shop.id, orderId);
    return Response.json(toOrderDto(order));
  });
}
