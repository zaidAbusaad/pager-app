import { createHash, randomBytes } from "node:crypto";

// The secret inside a cashier link, e.g. https://app/c/<token>.
// 32 random bytes = 256 bits: impossible to guess, so a fast hash (SHA-256)
// is enough. Slow hashes like bcrypt are for human-chosen passwords.
export function hashCashierToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateCashierToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashCashierToken(token) };
}
