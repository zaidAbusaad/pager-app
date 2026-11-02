// How often a caller may do something. A "policy" says: at most `limit`
// requests per `windowMs`. The server counts requests per key (for example the
// caller's IP address) and refuses once the count passes the limit.
export interface RatePolicy {
  name: string;
  limit: number;
  windowMs: number;
}

const MINUTE = 60_000;

export const RATE_POLICIES = {
  // password guessing: per IP address, and separately per email address
  login: { name: "login", limit: 10, windowMs: 15 * MINUTE },
  loginEmail: { name: "login-email", limit: 10, windowMs: 15 * MINUTE },
  // mass account creation
  register: { name: "register", limit: 5, windowMs: 60 * MINUTE },
  // customer scanning the counter QR / typing a number. Many customers share
  // one café Wi-Fi (one IP), so this is generous but stops scripts that try
  // every number.
  claim: { name: "claim", limit: 60, windowMs: 10 * MINUTE },
  // the customer page asks every 3 s (= 20 per minute) for its own order
  orderStatus: { name: "order-status", limit: 60, windowMs: MINUTE },
  release: { name: "release", limit: 10, windowMs: 10 * MINUTE },
} as const satisfies Record<string, RatePolicy>;

export interface RateDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

// Pure decision: given how many requests were counted so far (including this
// one) and when the window ends, may this request go through?
export function decide(
  policy: RatePolicy,
  count: number,
  resetsAtMs: number,
  nowMs: number,
): RateDecision {
  const allowed = count <= policy.limit;
  const retryAfterSeconds = Math.max(1, Math.ceil((resetsAtMs - nowMs) / 1000));
  return { allowed, retryAfterSeconds };
}
