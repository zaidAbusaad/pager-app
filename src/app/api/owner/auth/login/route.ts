import type { NextRequest } from "next/server";
import { handle } from "@/lib/http";
import { RATE_POLICIES } from "@/domain/rate-limit";
import { normalizeEmail } from "@/domain/owner";
import { clientIp } from "@/lib/client-ip";
import { ownerAuth, rateLimiter } from "@/server/container";
import { setSessionCookie } from "@/server/owner-session";
import { credentialsBody } from "@/validation/owner-schemas";

// POST /api/owner/auth/login   body: { email, password }
export async function POST(request: NextRequest) {
  return handle(async () => {
    const body = credentialsBody.parse(await request.json());
    // limit guesses per address AND per account (a botnet has many addresses)
    await rateLimiter.consume(RATE_POLICIES.login, clientIp(request.headers));
    await rateLimiter.consume(RATE_POLICIES.loginEmail, normalizeEmail(body.email));
    const login = await ownerAuth.login(body);
    await setSessionCookie(login);
    return Response.json({ email: login.owner.email });
  });
}
