import type { StatsOrder } from "@/domain/stats";
import { getPrisma } from "@/lib/db";
import type { StatsRepository } from "./stats-repository";

export class PrismaStatsRepository implements StatsRepository {
  listOrders(shopIds: string[], from: Date, to: Date): Promise<StatsOrder[]> {
    if (shopIds.length === 0) return Promise.resolve([]);
    return getPrisma().order.findMany({
      where: { shopId: { in: shopIds }, createdAt: { gte: from, lte: to } },
      select: {
        status: true,
        createdAt: true,
        readyAt: true,
        doneAt: true,
        claimedAt: true,
      },
    });
  }
}
