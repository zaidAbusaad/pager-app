import type { NextRequest } from "next/server";
import { handle } from "@/lib/http";
import { RATE_POLICIES } from "@/domain/rate-limit";
import { clientIp } from "@/lib/client-ip";
import { ownerAuth, rateLimiter } from "@/server/container";
import { assertSameOrigin } from "@/server/same-origin";
import { setSessionCookie } from "@/server/owner-session";
import { credentialsBody } from "@/validation/owner-schemas";

// POST /api/owner/auth/register   body: { email, password }
//   -> creates the account, logs in (sets the session cookie)
export async function POST(request: NextRequest) {
  return handle(async () => {
    assertSameOrigin(request);
    const body = credentialsBody.parse(await request.json());
    await rateLimiter.consume(RATE_POLICIES.register, clientIp(request.headers));
    const login = await ownerAuth.register(body);
    await setSessionCookie(login);
    return Response.json({ email: login.owner.email }, { status: 201 });
  });
}
