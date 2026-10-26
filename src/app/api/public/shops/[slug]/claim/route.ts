import type { NextRequest } from "next/server";
import { handle, readOptionalJson } from "@/lib/http";
import { toPublicOrderDto } from "@/lib/order-dto";
import { customerService } from "@/server/container";
import { claimBody } from "@/validation/order-schemas";
import { slugParams } from "@/validation/shop-schemas";

// POST /api/public/shops/:slug/claim
//   no body            -> links the phone to the newest waiting order
//   { "number": 27 }   -> links the phone to open order #27 (fallback)
// Responds with the linked order, including its private token.
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/public/shops/[slug]/claim">,
) {
  return handle(async () => {
    const { slug } = slugParams.parse(await ctx.params);
    const { number } = claimBody.parse(await readOptionalJson(request));
    const { order, shop } =
      number === undefined
        ? await customerService.claimLatest(slug)
        : await customerService.claimByNumber(slug, number);
    return Response.json(toPublicOrderDto(order, shop), {
      headers: { "Cache-Control": "no-store" },
    });
  });
}
