import { cashierAuth } from "./container";

// Reads "Authorization: Bearer <token>" from a request and returns the shop
// that token belongs to. Throws UNAUTHORIZED (401) otherwise.
export function requireCashier(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  return cashierAuth.authenticate(match?.[1] ?? null);
}
