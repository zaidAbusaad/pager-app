import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/domain/session-token";
import { handle } from "@/lib/http";
import { ownerAuth } from "@/server/container";
import { clearSessionCookie } from "@/server/owner-session";

// POST /api/owner/auth/logout -> ends the session in the database AND the cookie
export async function POST(request: NextRequest) {
  return handle(async () => {
    await ownerAuth.logout(request.cookies.get(SESSION_COOKIE)?.value);
    await clearSessionCookie();
    return new Response(null, { status: 204 });
  });
}
