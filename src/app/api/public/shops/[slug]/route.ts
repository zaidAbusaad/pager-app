import type { NextRequest } from "next/server";
import { handle } from "@/lib/http";
import { customerService } from "@/server/container";
import { slugParams } from "@/validation/shop-schemas";

// GET /api/public/shops/:slug  ->  { name }   (what the landing page shows)
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/public/shops/[slug]">,
) {
  return handle(async () => {
    const { slug } = slugParams.parse(await ctx.params);
    const shop = await customerService.getShop(slug);
    return Response.json(
      { name: shop.name },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
