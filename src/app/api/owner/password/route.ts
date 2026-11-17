import type { NextRequest } from "next/server";
import { handle } from "@/lib/http";
import { RATE_POLICIES } from "@/domain/rate-limit";
import { SESSION_COOKIE } from "@/domain/session-token";
import { ownerAuth, rateLimiter } from "@/server/container";
import { requireOwner } from "@/server/owner-session";
import { changePasswordBody } from "@/validation/owner-schemas";

// POST /api/owner/password   body: { currentPassword, newPassword }
export async function POST(request: NextRequest) {
  return handle(async () => {
    const owner = await requireOwner(request, { allowPasswordChange: true });
    const body = changePasswordBody.parse(await request.json());
    await rateLimiter.consume(RATE_POLICIES.changePassword, owner.id);
    const token = request.cookies.get(SESSION_COOKIE)?.value ?? "";
    await ownerAuth.changePassword(owner.id, token, body);
    return new Response(null, { status: 204 });
  });
}
