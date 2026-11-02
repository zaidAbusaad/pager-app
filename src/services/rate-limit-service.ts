import { DomainError } from "@/domain/errors";
import { decide, type RatePolicy } from "@/domain/rate-limit";
import type { RateLimitStore } from "@/repositories/rate-limit-store";

interface Deps {
  store: RateLimitStore;
  now?: () => Date;
}

export function createRateLimiter({ store, now = () => new Date() }: Deps) {
  return {
    // Counts one request under `policy` for `subject` (an IP, an email, a
    // token...). Throws RATE_LIMITED when the caller is over the limit.
    async consume(policy: RatePolicy, subject: string): Promise<void> {
      const nowMs = now().getTime();
      const key = `${policy.name}:${subject}`;
      const { count, resetsAtMs } = await store.hit(key, policy.windowMs, nowMs);
      const decision = decide(policy, count, resetsAtMs, nowMs);
      if (!decision.allowed) {
        throw new DomainError("TOO_MANY_REQUESTS", "Too many requests", {
          reason: "RATE_LIMITED",
          retryAfterSeconds: decision.retryAfterSeconds,
        });
      }
    },
  };
}

export type RateLimiter = ReturnType<typeof createRateLimiter>;
