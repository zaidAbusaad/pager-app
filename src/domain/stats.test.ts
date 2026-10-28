import { describe, expect, it } from "vitest";
import {
  type StatsOrder,
  computeStats,
  dayKey,
  localHour,
  startOfLocalDay,
  statsWindow,
} from "./stats";

const TZ = "Asia/Amman"; // UTC+3 all year
// "now" = 28 Oct 2026, 15:00 in Amman
const NOW = new Date("2026-10-28T12:00:00Z");

// Builds an order created at a LOCAL (Amman) time, e.g. at("2026-10-28", "13:05").
const at = (day: string, time: string) => new Date(`${day}T${time}:00+03:00`);
const order = (over: Partial<StatsOrder> & { created: Date }): StatsOrder => ({
  status: "DONE",
  createdAt: over.created,
  readyAt: null,
  doneAt: null,
  claimedAt: null,
  ...over,
});

describe("local time helpers", () => {
  it("reads the local hour and day, not the UTC ones", () => {
    const lateUtc = new Date("2026-10-28T21:30:00Z"); // 00:30 next day in Amman
    expect(localHour(lateUtc, TZ)).toBe(0);
    expect(dayKey(lateUtc, TZ)).toBe("2026-10-29");
  });

  it("finds the start of the local day", () => {
    expect(startOfLocalDay(new Date("2026-10-28T21:30:00Z"), TZ).toISOString()).toBe(
      "2026-10-28T21:00:00.000Z",
    );
    expect(startOfLocalDay(NOW, TZ).toISOString()).toBe("2026-10-27T21:00:00.000Z");
  });
});

describe("statsWindow", () => {
  it("today starts at local midnight; the previous window is yesterday up to the same time", () => {
    const w = statsWindow("today", NOW, TZ);
    expect(w.from.toISOString()).toBe("2026-10-27T21:00:00.000Z");
    expect(w.previousFrom.toISOString()).toBe("2026-10-26T21:00:00.000Z");
    expect(w.previousTo.toISOString()).toBe("2026-10-27T12:00:00.000Z");
  });

  it("7d covers today and the 6 days before", () => {
    const w = statsWindow("7d", NOW, TZ);
    expect(dayKey(w.from, TZ)).toBe("2026-10-22");
    expect(dayKey(w.previousFrom, TZ)).toBe("2026-10-15");
  });
});

describe("computeStats", () => {
  const window = statsWindow("7d", NOW, TZ);

  it("is all zero/null with no orders", () => {
    const s = computeStats([], window, "7d", TZ);
    expect(s).toMatchObject({
      orders: 0,
      cancelled: 0,
      avgPrepMinutes: null,
      avgPickupMinutes: null,
      phoneLinkedPercent: null,
      peakHour: null,
      busiestDay: null,
      slowestHour: null,
    });
    expect(s.byDay).toHaveLength(7);
    expect(s.byHour).toEqual(Array(24).fill(0));
  });

  it("counts orders, cancelled orders and averages", () => {
    const rows = [
      order({
        created: at("2026-10-28", "13:00"),
        readyAt: at("2026-10-28", "13:04"),
        doneAt: at("2026-10-28", "13:06"),
        claimedAt: at("2026-10-28", "13:00"),
      }),
      order({
        created: at("2026-10-28", "13:10"),
        status: "READY",
        readyAt: at("2026-10-28", "13:16"),
      }),
      order({ created: at("2026-10-28", "13:20"), status: "CANCELLED" }),
    ];
    const s = computeStats(rows, window, "7d", TZ);
    expect(s.orders).toBe(2); // cancelled is not an order
    expect(s.cancelled).toBe(1);
    expect(s.collected).toBe(1);
    expect(s.avgPrepMinutes).toBeCloseTo(5); // (4 + 6) / 2
    expect(s.avgPickupMinutes).toBeCloseTo(2);
    expect(s.phoneLinkedPercent).toBeCloseTo(50);
  });

  it("finds the peak hour and busiest day in local time", () => {
    const rows = [
      order({ created: at("2026-10-28", "13:05") }),
      order({ created: at("2026-10-28", "13:40") }),
      order({ created: at("2026-10-27", "13:15") }),
      order({ created: at("2026-10-27", "09:00") }),
      // 23:30 UTC on the 27th is 02:30 on the 28th in Amman
      order({ created: new Date("2026-10-27T23:30:00Z") }),
    ];
    const s = computeStats(rows, window, "7d", TZ);
    expect(s.peakHour).toEqual({ hour: 13, orders: 3 });
    expect(s.byHour[2]).toBe(1);
    expect(s.busiestDay).toEqual({ date: "2026-10-28", orders: 3 });
    expect(s.byDay.map((d) => d.date)[0]).toBe("2026-10-22");
    expect(s.byDay.at(-1)?.date).toBe("2026-10-28");
  });

  it("needs at least 3 orders in an hour to call it the slowest", () => {
    const slow = (day: string, time: string, ready: string) =>
      order({ created: at(day, time), readyAt: at(day, ready) });
    const rows = [
      slow("2026-10-28", "12:00", "12:02"),
      slow("2026-10-28", "12:10", "12:12"),
      slow("2026-10-28", "12:20", "12:22"),
      slow("2026-10-28", "14:00", "14:30"), // a single very slow hour: ignored
      slow("2026-10-28", "15:00", "15:08"),
      slow("2026-10-27", "15:00", "15:10"),
      slow("2026-10-26", "15:00", "15:12"),
    ];
    const s = computeStats(rows, window, "7d", TZ);
    expect(s.slowestHour?.hour).toBe(15);
    expect(s.slowestHour?.avgPrepMinutes).toBeCloseTo(10);
  });

  it("counts the previous period separately", () => {
    const rows = [
      order({ created: at("2026-10-28", "10:00") }),
      order({ created: at("2026-10-17", "10:00") }),
      order({ created: at("2026-10-16", "10:00") }),
      order({ created: at("2026-10-16", "11:00"), status: "CANCELLED" }),
    ];
    const s = computeStats(rows, window, "7d", TZ);
    expect(s.orders).toBe(1);
    expect(s.previousOrders).toBe(2);
  });
});
