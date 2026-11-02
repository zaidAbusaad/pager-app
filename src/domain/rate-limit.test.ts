import { describe, expect, it } from "vitest";
import { decide, RATE_POLICIES } from "./rate-limit";

const policy = { name: "t", limit: 3, windowMs: 60_000 };

describe("decide", () => {
  it("allows requests up to and including the limit", () => {
    expect(decide(policy, 1, 60_000, 0).allowed).toBe(true);
    expect(decide(policy, 3, 60_000, 0).allowed).toBe(true);
  });

  it("refuses requests over the limit and says how long to wait", () => {
    const d = decide(policy, 4, 60_000, 15_000);
    expect(d.allowed).toBe(false);
    expect(d.retryAfterSeconds).toBe(45);
  });

  it("never tells the caller to wait less than one second", () => {
    expect(decide(policy, 4, 1_000, 999).retryAfterSeconds).toBe(1);
    expect(decide(policy, 4, 1_000, 5_000).retryAfterSeconds).toBe(1);
  });
});

describe("policies", () => {
  it("lets the customer page poll comfortably (every 3 s = 20 per minute)", () => {
    expect(RATE_POLICIES.orderStatus.limit).toBeGreaterThanOrEqual(40);
  });
});
