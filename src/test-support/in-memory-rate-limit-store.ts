import type { RateHit, RateLimitStore } from "@/repositories/rate-limit-store";

// Fake that keeps the counters in memory. Used only by tests.
export class InMemoryRateLimitStore implements RateLimitStore {
  entries = new Map<string, RateHit>();

  async hit(key: string, windowMs: number, nowMs: number): Promise<RateHit> {
    const current = this.entries.get(key);
    const next: RateHit =
      !current || current.resetsAtMs <= nowMs
        ? { count: 1, resetsAtMs: nowMs + windowMs }
        : { count: current.count + 1, resetsAtMs: current.resetsAtMs };
    this.entries.set(key, next);
    return next;
  }
}
