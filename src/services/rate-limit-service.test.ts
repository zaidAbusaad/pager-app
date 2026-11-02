import { beforeEach, describe, expect, it } from "vitest";
import { DomainError } from "@/domain/errors";
import { InMemoryRateLimitStore } from "@/test-support/in-memory-rate-limit-store";
import { createRateLimiter } from "./rate-limit-service";

const policy = { name: "t", limit: 3, windowMs: 60_000 };
let time = new Date("2026-11-02T10:00:00Z");
let limiter: ReturnType<typeof createRateLimiter>;

beforeEach(() => {
  time = new Date("2026-11-02T10:00:00Z");
  limiter = createRateLimiter({ store: new InMemoryRateLimitStore(), now: () => time });
});

describe("consume", () => {
  it("lets requests through up to the limit", async () => {
    for (let i = 0; i < 3; i++) await limiter.consume(policy, "1.2.3.4");
  });

  it("refuses the next one with RATE_LIMITED and a retry time", async () => {
    for (let i = 0; i < 3; i++) await limiter.consume(policy, "1.2.3.4");
    const error = await limiter.consume(policy, "1.2.3.4").catch((e) => e);
    expect(error).toBeInstanceOf(DomainError);
    expect(error.code).toBe("TOO_MANY_REQUESTS");
    expect(error.reason).toBe("RATE_LIMITED");
    expect(error.retryAfterSeconds).toBe(60);
  });

  it("counts each caller separately", async () => {
    for (let i = 0; i < 3; i++) await limiter.consume(policy, "1.2.3.4");
    await expect(limiter.consume(policy, "5.6.7.8")).resolves.toBeUndefined();
  });

  it("counts each policy separately", async () => {
    for (let i = 0; i < 3; i++) await limiter.consume(policy, "1.2.3.4");
    await expect(
      limiter.consume({ ...policy, name: "other" }, "1.2.3.4"),
    ).resolves.toBeUndefined();
  });

  it("starts fresh once the window has passed", async () => {
    for (let i = 0; i < 3; i++) await limiter.consume(policy, "1.2.3.4");
    time = new Date(time.getTime() + 60_001);
    await expect(limiter.consume(policy, "1.2.3.4")).resolves.toBeUndefined();
  });

  it("reports the remaining wait, not the full window, later in the window", async () => {
    for (let i = 0; i < 3; i++) await limiter.consume(policy, "1.2.3.4");
    time = new Date(time.getTime() + 20_000);
    const error = await limiter.consume(policy, "1.2.3.4").catch((e) => e);
    expect(error.retryAfterSeconds).toBe(40);
  });
});
