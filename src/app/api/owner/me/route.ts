import type { NextRequest } from "next/server";
import { summarizeSubscription } from "@/domain/subscription";
import { handle } from "@/lib/http";
import { requireOwner } from "@/server/owner-session";

// GET /api/owner/me -> who is logged in (401 if nobody), plus where their
// subscription stands, so the pages can show the right banner.
export async function GET(request: NextRequest) {
  return handle(async () => {
    const owner = await requireOwner(request);
    return Response.json(
      {
        email: owner.email,
        subscription: summarizeSubscription(owner.activeUntil, new Date()),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
