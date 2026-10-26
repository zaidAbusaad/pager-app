import type { Order, OrderStatus, StatusPatch } from "@/domain/order";

// The possible outcomes of creating an order. A union type like this makes the
// caller handle every case; nothing is hidden in exceptions or null checks.
export type CreateOrderResult =
  | { kind: "created"; order: Order }
  | { kind: "shop_not_found" }
  | { kind: "number_taken" };

export interface CreateOrderInput {
  shopId: string;
  claimToken: string; // the secret for this order's customer link
  requestedNumber?: number; // omit for the next free number
}

export type ReopenResult =
  | { kind: "reopened"; order: Order }
  | { kind: "number_taken" } // a newer unfinished order now uses this number
  | { kind: "not_done" }; // missing, or no longer collected

export type ClaimByNumberResult =
  | { kind: "claimed"; order: Order }
  | { kind: "not_found" } // no unfinished order with that number
  | { kind: "already_claimed" }; // some phone is already linked to it

// What the service needs from "a place that stores orders". The service only
// knows this interface, never Prisma, so storage can change without touching
// business rules, and tests can use an in-memory fake.
export interface OrderRepository {
  // Creates an order for the shop. Uses `requestedNumber` if given, otherwise
  // the next free number. No two unfinished orders may share a number.
  createForShop(input: CreateOrderInput): Promise<CreateOrderResult>;

  // The number the next automatic order will get (for display on the board).
  peekNextNumber(shopId: string): Promise<number>;

  findById(id: string): Promise<Order | null>;

  // Finds an order by the secret in its customer link.
  findByClaimToken(claimToken: string): Promise<Order | null>;

  // The shop's unfinished orders (PREPARING and READY), lowest number first.
  listActiveByShop(shopId: string): Promise<Order[]>;

  // The most recently collected (DONE) orders, newest first.
  listRecentDoneByShop(shopId: string, limit: number): Promise<Order[]>;

  // Moves an order from `from` to `to` ONLY if it is still in `from`.
  // Returns null if nothing matched (order missing or already changed).
  transition(
    id: string,
    from: OrderStatus,
    to: OrderStatus,
    patch: StatusPatch,
  ): Promise<Order | null>;

  // Undo "collected": DONE -> READY, but only if no newer unfinished order has
  // taken the same number in the meantime.
  reopenDone(id: string, patch: StatusPatch): Promise<ReopenResult>;

  // Deletes a PENDING (PREPARING) order. Returns false if it is missing or no
  // longer pending. Gives its number back if it was the latest one issued.
  deletePreparing(id: string): Promise<boolean>;

  // Counter QR: atomically links the shop's NEWEST unfinished, unclaimed order
  // created at or after `since`. Two phones can never get the same order.
  // Returns null when no order is waiting.
  claimLatestForShop(
    shopId: string,
    since: Date,
    now: Date,
  ): Promise<Order | null>;

  // Typed number: atomically links the unfinished order with this number.
  claimByNumber(
    shopId: string,
    number: number,
    now: Date,
  ): Promise<ClaimByNumberResult>;

  // Marks an order as linked if it is not already (keeps the first time).
  markClaimed(orderId: string, now: Date): Promise<void>;

  // Cashier "reset": gives the order a NEW secret (the old link stops working
  // at once) and marks it unclaimed. Null if the order is not in this shop.
  resetClaim(
    shopId: string,
    orderId: string,
    newClaimToken: string,
  ): Promise<Order | null>;
}
