import type { NextRequest } from "next/server";
import { handle } from "@/lib/http";
import { ownerAuth } from "@/server/container";
import { setSessionCookie } from "@/server/owner-session";
import { credentialsBody } from "@/validation/owner-schemas";

// POST /api/owner/auth/register   body: { email, password }
//   -> creates the account, logs in (sets the session cookie)
export async function POST(request: NextRequest) {
  return handle(async () => {
    const body = credentialsBody.parse(await request.json());
    const login = await ownerAuth.register(body);
    await setSessionCookie(login);
    return Response.json({ email: login.owner.email }, { status: 201 });
  });
}
