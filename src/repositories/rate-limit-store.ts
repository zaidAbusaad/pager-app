export interface RateHit {
  count: number; // requests counted in the current window, including this one
  resetsAtMs: number; // when the window ends and the count starts over
}

// Counts requests per key. Must be atomic: two requests at the same moment
// have to be counted as two.
export interface RateLimitStore {
  hit(key: string, windowMs: number, nowMs: number): Promise<RateHit>;
}
