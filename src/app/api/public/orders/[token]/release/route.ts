import type { NextRequest } from "next/server";
import { handle } from "@/lib/http";
import { customerService } from "@/server/container";
import { tokenParams } from "@/validation/order-schemas";

// POST /api/public/orders/:token/release   ("Not my order")
export async function POST(
  _request: NextRequest,
  ctx: RouteContext<"/api/public/orders/[token]/release">,
) {
  return handle(async () => {
    const { token } = tokenParams.parse(await ctx.params);
    await customerService.release(token);
    return new Response(null, { status: 204 });
  });
}
