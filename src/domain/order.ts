import { DomainError } from "./errors";

export const ORDER_STATUSES = ["PREPARING", "READY", "DONE"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface Order {
  id: string;
  shopId: string;
  number: number;
  status: OrderStatus;
  createdAt: Date;
  readyAt: Date | null;
  doneAt: Date | null;
  claimToken: string; // secret in the customer link (/o/<claimToken>)
  claimedAt: Date | null; // when a phone linked to this order, if any
}

// The timestamps that change together with a status.
export interface StatusPatch {
  readyAt?: Date | null;
  doneAt?: Date | null;
}

// Which status may follow which. This table IS the business rule.
//   PREPARING -> READY      cashier taps "ready"
//   READY     -> DONE       customer collected the order
//   READY     -> PREPARING  undo, "ready" was tapped by mistake
//   DONE      -> READY      undo, "collected" was tapped by mistake
const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PREPARING: ["READY"],
  READY: ["DONE", "PREPARING"],
  DONE: ["READY"],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertCanTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new DomainError(
      "INVALID_TRANSITION",
      `An order cannot go from ${from} to ${to}`,
    );
  }
}

// Which timestamps to write when an order moves to `to`.
export function statusPatch(to: OrderStatus, now: Date): StatusPatch {
  switch (to) {
    case "READY":
      return { readyAt: now, doneAt: null };
    case "DONE":
      return { doneAt: now };
    case "PREPARING":
      return { readyAt: null, doneAt: null };
  }
}
