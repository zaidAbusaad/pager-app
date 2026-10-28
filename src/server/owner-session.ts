import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/domain/session-token";
import type { LoginResult } from "@/services/owner-auth-service";
import { ownerAuth } from "./container";

// Puts the session secret into a cookie.
//  httpOnly  -> page JavaScript cannot read it (limits damage from XSS)
//  sameSite  -> the browser does not send it on requests started by other
//               websites (blocks cross-site request forgery)
//  secure    -> only over HTTPS in production
export async function setSessionCookie(login: LoginResult) {
  (await cookies()).set(SESSION_COOKIE, login.sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: login.expiresAt,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

// The logged-in owner for an API request, or throws UNAUTHORIZED (401).
export function requireOwner(request: NextRequest) {
  return ownerAuth.authenticate(request.cookies.get(SESSION_COOKIE)?.value);
}
