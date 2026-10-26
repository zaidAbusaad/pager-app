import { randomBytes } from "node:crypto";

// After the cashier creates an order, the shop's counter QR can hand it to the
// NEXT phone that scans, but only for this long. After that the order must be
// linked another way (the cashier's per-order QR, or typing the number).
export const CLAIM_WINDOW_MS = 2 * 60 * 1000;

// Orders created before this moment are too old for the counter QR.
export function claimWindowStart(now: Date): Date {
  return new Date(now.getTime() - CLAIM_WINDOW_MS);
}

// The secret in a customer link. 16 random bytes = 128 bits: unguessable.
// base64url keeps it URL-safe (letters, digits, "-" and "_").
export function generateClaimToken(): string {
  return randomBytes(16).toString("base64url");
}
