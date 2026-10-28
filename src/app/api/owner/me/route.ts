import type { NextRequest } from "next/server";
import { handle } from "@/lib/http";
import { requireOwner } from "@/server/owner-session";

// GET /api/owner/me -> who is logged in (401 if nobody)
export async function GET(request: NextRequest) {
  return handle(async () => {
    const owner = await requireOwner(request);
    return Response.json({ email: owner.email }, { headers: { "Cache-Control": "no-store" } });
  });
}
