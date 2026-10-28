import type { OrderStatus } from "./order";

// Statistics are computed here from plain order rows. No database, no screens:
// pure functions that are easy to test. "Local" means the shop's time zone,
// because "orders at 13:00" must mean 13:00 on the wall clock in Jordan, not
// 13:00 in UTC.

// All shops are in Jordan for now. Later this can become a per-shop setting.
export const STATS_TIME_ZONE = "Asia/Amman";

export const STATS_RANGES = ["today", "7d", "30d"] as const;
export type StatsRange = (typeof STATS_RANGES)[number];

// The columns the statistics need from an order.
export interface StatsOrder {
  status: OrderStatus;
  createdAt: Date;
  readyAt: Date | null;
  doneAt: Date | null;
  claimedAt: Date | null;
}

export interface StatsWindow {
  from: Date;
  to: Date; // "now"
  // The same-length window just before, to show "vs previous period".
  previousFrom: Date;
  previousTo: Date;
}

export interface Stats {
  range: StatsRange;
  timeZone: string;
  orders: number; // cancelled orders are not counted here
  previousOrders: number;
  cancelled: number;
  collected: number;
  avgPrepMinutes: number | null; // entered -> marked ready
  avgPickupMinutes: number | null; // marked ready -> collected
  phoneLinkedPercent: number | null; // % of orders a phone linked to
  avgOrdersPerDay: number;
  byDay: { date: string; orders: number }[]; // date = "2026-10-28" (local)
  byHour: number[]; // 24 numbers: orders per local hour
  peakHour: { hour: number; orders: number } | null;
  busiestDay: { date: string; orders: number } | null;
  slowestHour: { hour: number; avgPrepMinutes: number } | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
// A "slowest hour" needs a few orders behind it, or one odd order decides it.
const MIN_ORDERS_FOR_SLOWEST = 3;

// ---- local time helpers (using the built-in Intl, no library) ----

function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

// How far the time zone is ahead of UTC at this moment, in milliseconds.
function offsetMs(date: Date, timeZone: string): number {
  const p = localParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

export function localHour(date: Date, timeZone: string): number {
  return localParts(date, timeZone).hour;
}

// "2026-10-28": the calendar day on the shop's wall clock.
export function dayKey(date: Date, timeZone: string): string {
  const p = localParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

// The moment (UTC) when this local day began, i.e. local 00:00.
export function startOfLocalDay(date: Date, timeZone: string): Date {
  const p = localParts(date, timeZone);
  const midnightAsUtc = Date.UTC(p.year, p.month - 1, p.day);
  // Subtract the offset twice-checked, so a daylight-saving change cannot
  // shift the result by an hour.
  let start = midnightAsUtc - offsetMs(new Date(midnightAsUtc), timeZone);
  start = midnightAsUtc - offsetMs(new Date(start), timeZone);
  return new Date(start);
}

// ---- the time windows ----

export function statsWindow(
  range: StatsRange,
  now: Date,
  timeZone: string = STATS_TIME_ZONE,
): StatsWindow {
  const days = range === "today" ? 1 : range === "7d" ? 7 : 30;
  const from = startOfLocalDay(new Date(now.getTime() - (days - 1) * DAY_MS), timeZone);
  const shift = days * DAY_MS;
  return {
    from,
    to: now,
    previousFrom: startOfLocalDay(new Date(from.getTime() - shift + 12 * 60 * 60 * 1000), timeZone),
    previousTo: new Date(now.getTime() - shift),
  };
}

// ---- the numbers ----

const average = (values: number[]) =>
  values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length;

const minutesBetween = (a: Date, b: Date) => (b.getTime() - a.getTime()) / 60000;

export function computeStats(
  rows: StatsOrder[],
  window: StatsWindow,
  range: StatsRange,
  timeZone: string = STATS_TIME_ZONE,
): Stats {
  const inWindow = (o: StatsOrder, from: Date, to: Date) =>
    o.createdAt >= from && o.createdAt <= to;

  const current = rows.filter((o) => inWindow(o, window.from, window.to));
  const previous = rows.filter((o) => inWindow(o, window.previousFrom, window.previousTo));
  const real = current.filter((o) => o.status !== "CANCELLED");

  // every local day in the window, even days with no orders (shown as 0)
  const dayCounts = new Map<string, number>();
  for (
    let day = window.from;
    day <= window.to;
    day = startOfLocalDay(new Date(day.getTime() + 36 * 60 * 60 * 1000), timeZone)
  ) {
    dayCounts.set(dayKey(day, timeZone), 0);
  }

  const byHour = Array<number>(24).fill(0);
  const prepByHour: number[][] = Array.from({ length: 24 }, () => []);
  for (const o of real) {
    const key = dayKey(o.createdAt, timeZone);
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
    const hour = localHour(o.createdAt, timeZone);
    byHour[hour] += 1;
    if (o.readyAt) prepByHour[hour].push(minutesBetween(o.createdAt, o.readyAt));
  }

  const byDay = [...dayCounts].map(([date, orders]) => ({ date, orders }));

  const peak = byHour.reduce((best, n, hour) => (n > best.orders ? { hour, orders: n } : best), {
    hour: 0,
    orders: 0,
  });
  const busiest = byDay.reduce((best, d) => (d.orders > best.orders ? d : best), {
    date: "",
    orders: 0,
  });

  let slowest: Stats["slowestHour"] = null;
  prepByHour.forEach((minutes, hour) => {
    const avg = average(minutes);
    if (avg !== null && minutes.length >= MIN_ORDERS_FOR_SLOWEST) {
      if (!slowest || avg > slowest.avgPrepMinutes) slowest = { hour, avgPrepMinutes: avg };
    }
  });

  const done = real.filter((o) => o.status === "DONE");
  return {
    range,
    timeZone,
    orders: real.length,
    previousOrders: previous.filter((o) => o.status !== "CANCELLED").length,
    cancelled: current.length - real.length,
    collected: done.length,
    avgPrepMinutes: average(real.filter((o) => o.readyAt).map((o) => minutesBetween(o.createdAt, o.readyAt!))),
    avgPickupMinutes: average(
      done.filter((o) => o.readyAt && o.doneAt).map((o) => minutesBetween(o.readyAt!, o.doneAt!)),
    ),
    phoneLinkedPercent:
      real.length === 0 ? null : (real.filter((o) => o.claimedAt).length / real.length) * 100,
    avgOrdersPerDay: byDay.length === 0 ? 0 : real.length / byDay.length,
    byDay,
    byHour,
    peakHour: peak.orders > 0 ? peak : null,
    busiestDay: busiest.orders > 0 ? busiest : null,
    slowestHour: slowest,
  };
}
