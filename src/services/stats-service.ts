import { DomainError } from "@/domain/errors";
import { type Stats, type StatsRange, computeStats, statsWindow } from "@/domain/stats";
import type { OwnerShopRepository } from "@/repositories/owner-shop-repository";
import type { StatsRepository } from "@/repositories/stats-repository";

interface Deps {
  branches: OwnerShopRepository;
  stats: StatsRepository;
  now?: () => Date;
}

export function createStatsService({ branches, stats, now = () => new Date() }: Deps) {
  return {
    // Statistics for ALL of an owner's branches, or one branch (shopId).
    // A shopId that is not the owner's looks the same as "does not exist".
    async getStats(
      ownerId: string,
      input: { range: StatsRange; shopId?: string },
    ): Promise<Stats> {
      const owned = await branches.listByOwner(ownerId);
      let shopIds = owned.map((s) => s.id);
      if (input.shopId !== undefined) {
        if (!shopIds.includes(input.shopId)) {
          throw new DomainError("NOT_FOUND", "Branch not found", { reason: "BRANCH_NOT_FOUND" });
        }
        shopIds = [input.shopId];
      }
      const window = statsWindow(input.range, now());
      const rows = await stats.listOrders(shopIds, window.previousFrom, window.to);
      return computeStats(rows, window, input.range);
    },
  };
}

export type StatsService = ReturnType<typeof createStatsService>;
