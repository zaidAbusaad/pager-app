import { describe, expect, it } from "vitest";
import { DomainError } from "./errors";
import {
  assertCanTransition,
  canTransition,
  statusPatch,
  type OrderStatus,
} from "./order";

describe("order status rules", () => {
  it.each<[OrderStatus, OrderStatus]>([
    ["PREPARING", "READY"],
    ["READY", "DONE"],
    ["READY", "PREPARING"], // undo a mistaken "ready"
  ])("allows %s -> %s", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each<[OrderStatus, OrderStatus]>([
    ["PREPARING", "DONE"], // must be ready before it can be collected
    ["DONE", "PREPARING"], // finished orders never come back
    ["DONE", "READY"],
    ["PREPARING", "PREPARING"],
    ["READY", "READY"],
  ])("rejects %s -> %s", (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });

  it("throws an INVALID_TRANSITION DomainError for a forbidden move", () => {
    expect(() => assertCanTransition("DONE", "PREPARING")).toThrow(DomainError);
    try {
      assertCanTransition("DONE", "PREPARING");
    } catch (error) {
      expect((error as DomainError).code).toBe("INVALID_TRANSITION");
    }
  });

  it("does not throw for an allowed move", () => {
    expect(() => assertCanTransition("PREPARING", "READY")).not.toThrow();
  });
});

describe("statusPatch", () => {
  const now = new Date("2026-10-22T12:00:00Z");

  it("stamps readyAt when an order becomes READY", () => {
    expect(statusPatch("READY", now)).toEqual({ readyAt: now, doneAt: null });
  });

  it("stamps doneAt when an order becomes DONE", () => {
    expect(statusPatch("DONE", now)).toEqual({ doneAt: now });
  });

  it("clears both timestamps when READY is undone", () => {
    expect(statusPatch("PREPARING", now)).toEqual({
      readyAt: null,
      doneAt: null,
    });
  });
});
