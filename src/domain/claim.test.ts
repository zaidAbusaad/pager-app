import { describe, expect, it } from "vitest";
import {
  CLAIM_WINDOW_MS,
  claimWindowStart,
  generateClaimToken,
} from "./claim";

describe("claim window", () => {
  it("starts exactly CLAIM_WINDOW_MS before now", () => {
    const now = new Date("2026-10-26T12:00:00Z");
    expect(claimWindowStart(now).getTime()).toBe(
      now.getTime() - CLAIM_WINDOW_MS,
    );
  });
});

describe("generateClaimToken", () => {
  it("is URL-safe and long enough to be unguessable", () => {
    const token = generateClaimToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });

  it("is different every time", () => {
    const tokens = new Set(Array.from({ length: 100 }, generateClaimToken));
    expect(tokens.size).toBe(100);
  });
});
