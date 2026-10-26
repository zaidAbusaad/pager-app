import { describe, expect, it } from "vitest";
import { generateCashierToken, hashCashierToken } from "./cashier-token";

describe("cashier token", () => {
  it("returns a long random token and the hash of that token", () => {
    const { token, hash } = generateCashierToken();
    expect(token).toHaveLength(43); // 32 bytes in base64url
    expect(hash).toBe(hashCashierToken(token));
  });

  it("never stores the secret itself: the hash is different from the token", () => {
    const { token, hash } = generateCashierToken();
    expect(hash).not.toContain(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/); // SHA-256 as hex
  });

  it("generates a different token every time", () => {
    const tokens = new Set(
      Array.from({ length: 50 }, () => generateCashierToken().token),
    );
    expect(tokens.size).toBe(50);
  });

  it("hashing is deterministic, so a link can be looked up later", () => {
    expect(hashCashierToken("abc")).toBe(hashCashierToken("abc"));
    expect(hashCashierToken("abc")).not.toBe(hashCashierToken("abd"));
  });
});
