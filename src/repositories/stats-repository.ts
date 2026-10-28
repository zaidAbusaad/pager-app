import type { StatsOrder } from "@/domain/stats";

export interface StatsRepository {
  // Orders created between `from` and `to` (inclusive) in any of these shops.
  // Only the columns statistics need: no order numbers, no secrets.
  listOrders(shopIds: string[], from: Date, to: Date): Promise<StatsOrder[]>;
}
