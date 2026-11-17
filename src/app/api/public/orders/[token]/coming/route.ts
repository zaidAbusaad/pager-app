import type { NextRequest } from "next/server";
import { handle } from "@/lib/http";
import { toPublicOrderDto } from "@/lib/order-dto";
import { RATE_POLICIES } from "@/domain/rate-limit";
import { customerService, rateLimiter } from "@/server/container";
import { tokenParams } from "@/validation/order-schemas";

// POST /api/public/orders/:token/coming   ("I'm coming")
export async function POST(
  _request: NextRequest,
  ctx: RouteContext<"/api/public/orders/[token]/coming">,
) {
  return handle(async () => {
    const { token } = tokenParams.parse(await ctx.params);
    await rateLimiter.consume(RATE_POLICIES.coming, token);
    const { order, shop } = await customerService.imComing(token);
    return Response.json(toPublicOrderDto(order, shop), {
      headers: { "Cache-Control": "no-store" },
    });
  });
}
