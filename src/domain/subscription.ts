// When an owner may use Pagerly. One date decides everything: `activeUntil`
// on the owner's account.
//
//   activeUntil is empty            -> "pending": signed up, not activated yet
//   now is before activeUntil       -> "active"
//   up to GRACE_DAYS after it       -> "grace": still works, owner is warned
//   later than that                 -> "expired": cashier screens stop
//
// Nothing is ever deleted when an account expires. Renewing just moves the
// date forward and everything works again, with all the old data.
export const GRACE_DAYS = 3;
// The owner's pages start warning this many days before the end date.
export const EXPIRY_WARNING_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export type SubscriptionState = "pending" | "active" | "grace" | "expired";

export function graceEndsAt(activeUntil: Date): Date {
  return new Date(activeUntil.getTime() + GRACE_DAYS * DAY_MS);
}

export function subscriptionState(
  activeUntil: Date | null,
  now: Date,
): SubscriptionState {
  if (activeUntil === null) return "pending";
  if (now.getTime() < activeUntil.getTime()) return "active";
  if (now.getTime() < graceEndsAt(activeUntil).getTime()) return "grace";
  return "expired";
}

// Cashier screens and new orders work in these two states only.
export function canUseService(state: SubscriptionState): boolean {
  return state === "active" || state === "grace";
}

// Adds calendar months (in UTC). Jan 31 + 1 month is Feb 28 (or 29), never
// "March 3", which is what plain JavaScript would give.
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

// The new end date after a payment. It counts from whichever is later, "now"
// or the current end date: paying early loses no days, and paying late does
// not hand back days that already passed.
export function extendSubscription(
  current: Date | null,
  now: Date,
  months: number,
): Date {
  const start = current !== null && current.getTime() > now.getTime() ? current : now;
  return addMonths(start, months);
}

// What the owner's pages need to show the right banner. Dates travel as text
// (ISO), and the day count is worked out here, so screens never need a clock.
export interface SubscriptionSummary {
  state: SubscriptionState;
  activeUntil: string | null;
  graceEndsAt: string | null;
  // Whole days left while "active"; null in every other state.
  daysLeft: number | null;
}

export function summarizeSubscription(
  activeUntil: Date | null,
  now: Date,
): SubscriptionSummary {
  const state = subscriptionState(activeUntil, now);
  return {
    state,
    activeUntil: activeUntil?.toISOString() ?? null,
    graceEndsAt: activeUntil ? graceEndsAt(activeUntil).toISOString() : null,
    daysLeft:
      state === "active" && activeUntil
        ? Math.ceil((activeUntil.getTime() - now.getTime()) / DAY_MS)
        : null,
  };
}
