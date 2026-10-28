import type { NextRequest } from "next/server";
import { handle } from "@/lib/http";
import { statsService } from "@/server/container";
import { requireOwner } from "@/server/owner-session";
import { statsQuery } from "@/validation/owner-schemas";

// GET /api/owner/stats?range=today|7d|30d&shopId=<optional>
//   -> numbers for the dashboard: orders, times, peak hour, per hour/day...
export async function GET(request: NextRequest) {
  return handle(async () => {
    const owner = await requireOwner(request);
    const query = statsQuery.parse(Object.fromEntries(request.nextUrl.searchParams));
    const stats = await statsService.getStats(owner.id, query);
    return Response.json(stats, { headers: { "Cache-Control": "no-store" } });
  });
}
