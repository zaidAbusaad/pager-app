import { z } from "zod";
import { SETTABLE_STATUSES } from "@/domain/order";

// Zod checks untrusted input at the edge of the app. If it does not match,
// it throws a ZodError that `handle()` turns into a 400 response.
export const orderParams = z.object({
  orderId: z.string().trim().min(1).max(64),
});

// The secret from a customer link. Long random base64url text.
export const tokenParams = z.object({
  token: z
    .string()
    .trim()
    .min(16)
    .max(64)
    .regex(/^[A-Za-z0-9_-]+$/, "Invalid order link"),
});

// Body of POST /api/public/shops/:slug/claim. With a number the customer
// asks for that order; without one they ask for the latest waiting order.
export const claimBody = z.object({
  number: z.int().min(1).max(9999).optional(),
});

export const statusBody = z.object({
  status: z.enum(SETTABLE_STATUSES),
});

// Body of POST /api/cashier/orders. "number" is optional: leave it out and the
// shop's next automatic number is used.
export const createOrderBody = z.object({
  number: z.int().min(1).max(9999).optional(),
});
