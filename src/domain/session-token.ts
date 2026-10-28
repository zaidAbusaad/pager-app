import { createHash, randomBytes } from "node:crypto";

// A login session: after a correct password we give the browser a random
// secret in a cookie. The database keeps only its SHA-256 hash, so a leaked
// database cannot be used to hijack logins (same idea as cashier links).
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const SESSION_COOKIE = "pager_session";

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateSessionToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashSessionToken(token) };
}
