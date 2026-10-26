import type { NextRequest } from "next/server";
import { handle } from "@/lib/http";
import { toOrderDto } from "@/lib/order-dto";
import { orderService } from "@/server/container";
import { requireCashier } from "@/server/require-cashier";
import { orderParams, statusBody } from "@/validation/order-schemas";

// PATCH /api/cashier/orders/:orderId   body: { "status": "READY" | "DONE" | "PREPARING" }
// READY = order is ready, DONE = customer collected it, PREPARING = undo a mistaken "ready".
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/cashier/orders/[orderId]">,
) {
  return handle(async () => {
    // Authenticate first: strangers get 401 before we look at anything else.
    const shop = await requireCashier(request);
    const { orderId } = orderParams.parse(await ctx.params);
    const { status } = statusBody.parse(await request.json());
    const order = await orderService.setStatus(shop.id, orderId, status);
    return Response.json(toOrderDto(order));
  });
}

// DELETE /api/cashier/orders/:orderId   (pending orders only)
export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<"/api/cashier/orders/[orderId]">,
) {
  return handle(async () => {
    const shop = await requireCashier(request);
    const { orderId } = orderParams.parse(await ctx.params);
    await orderService.deleteOrder(shop.id, orderId);
    return new Response(null, { status: 204 });
  });
}
