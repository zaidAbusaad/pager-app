import { describe, expect, it } from "vitest";
import {
  GRACE_DAYS,
  addMonths,
  canUseService,
  extendSubscription,
  graceEndsAt,
  subscriptionState,
  summarizeSubscription,
} from "./subscription";

const now = new Date("2026-11-17T12:00:00Z");
const day = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

describe("subscriptionState", () => {
  it("is pending when the account was never activated", () => {
    expect(subscriptionState(null, now)).toBe("pending");
  });

  it("is active before the end date", () => {
    expect(subscriptionState(day(10), now)).toBe("active");
  });

  it("enters the grace period at the end date", () => {
    expect(subscriptionState(now, now)).toBe("grace");
    expect(subscriptionState(day(-1), now)).toBe("grace");
  });

  it("expires once the grace period is over", () => {
    expect(subscriptionState(day(-GRACE_DAYS), now)).toBe("expired");
    expect(subscriptionState(day(-30), now)).toBe("expired");
  });

  it("lets active and grace accounts use the service, nobody else", () => {
    expect(canUseService("active")).toBe(true);
    expect(canUseService("grace")).toBe(true);
    expect(canUseService("pending")).toBe(false);
    expect(canUseService("expired")).toBe(false);
  });
});

describe("addMonths", () => {
  it("adds calendar months", () => {
    expect(addMonths(new Date("2026-11-17T12:00:00Z"), 1).toISOString()).toBe(
      "2026-12-17T12:00:00.000Z",
    );
    expect(addMonths(new Date("2026-11-17T12:00:00Z"), 12).toISOString()).toBe(
      "2027-11-17T12:00:00.000Z",
    );
  });

  it("does not spill into the next month at the end of a month", () => {
    expect(addMonths(new Date("2027-01-31T10:00:00Z"), 1).toISOString()).toBe(
      "2027-02-28T10:00:00.000Z",
    );
    expect(addMonths(new Date("2028-01-31T10:00:00Z"), 1).toISOString()).toBe(
      "2028-02-29T10:00:00.000Z",
    );
  });
});

describe("extendSubscription", () => {
  it("starts from now for a new or lapsed account", () => {
    expect(extendSubscription(null, now, 1).toISOString()).toBe("2026-12-17T12:00:00.000Z");
    expect(extendSubscription(day(-40), now, 1).toISOString()).toBe("2026-12-17T12:00:00.000Z");
  });

  it("adds to the current end date when renewing early", () => {
    const end = new Date("2026-12-01T12:00:00Z");
    expect(extendSubscription(end, now, 1).toISOString()).toBe("2027-01-01T12:00:00.000Z");
  });
});

describe("summarizeSubscription", () => {
  it("counts the days left only while active", () => {
    expect(summarizeSubscription(day(5), now)).toMatchObject({ state: "active", daysLeft: 5 });
    expect(summarizeSubscription(day(-1), now)).toMatchObject({ state: "grace", daysLeft: null });
    expect(summarizeSubscription(null, now)).toEqual({
      state: "pending",
      activeUntil: null,
      graceEndsAt: null,
      daysLeft: null,
    });
  });

  it("reports when the grace period ends", () => {
    const end = day(-1);
    expect(summarizeSubscription(end, now).graceEndsAt).toBe(graceEndsAt(end).toISOString());
  });
});
