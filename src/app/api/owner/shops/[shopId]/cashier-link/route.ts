import type { NextRequest } from "next/server";
import { handle } from "@/lib/http";
import { branchService } from "@/server/container";
import { requireOwner } from "@/server/owner-session";
import { branchParams } from "@/validation/owner-schemas";

// POST /api/owner/shops/:shopId/cashier-link
//   -> replaces the cashier link; the old one stops working at once
export async function POST(request: NextRequest, ctx: RouteContext<"/api/owner/shops/[shopId]/cashier-link">) {
  return handle(async () => {
    const owner = await requireOwner(request);
    const { shopId } = branchParams.parse(await ctx.params);
    return Response.json(await branchService.rotateCashierLink(owner.id, shopId));
  });
}
