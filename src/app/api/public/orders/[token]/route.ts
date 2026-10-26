import type { NextRequest } from "next/server";
import { handle } from "@/lib/http";
import { toPublicOrderDto } from "@/lib/order-dto";
import { customerService } from "@/server/container";
import { tokenParams } from "@/validation/order-schemas";

// GET /api/public/orders/:token  ->  the customer's number and live status.
// The token is the secret from the customer link / QR code.
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/public/orders/[token]">,
) {
  return handle(async () => {
    const { token } = tokenParams.parse(await ctx.params);
    const { order, shop } = await customerService.getOrderStatus(token);
    return Response.json(toPublicOrderDto(order, shop), {
      headers: { "Cache-Control": "no-store" },
    });
  });
}
