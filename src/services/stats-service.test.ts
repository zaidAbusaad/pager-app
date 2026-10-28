import { describe, expect, it } from "vitest";
import type { StatsOrder } from "@/domain/stats";
import type { StatsRepository } from "@/repositories/stats-repository";
import { InMemoryOwnerShopRepository } from "@/test-support/in-memory-owner-shop-repository";
import { createStatsService } from "./stats-service";

const NOW = new Date("2026-10-28T12:00:00Z");

describe("stats service", () => {
  async function setup() {
    const branches = new InMemoryOwnerShopRepository();
    const mine = await branches.create({ ownerId: "o1", name: "A", slug: "a", cashierTokenHash: "h1" });
    const mine2 = await branches.create({ ownerId: "o1", name: "B", slug: "b", cashierTokenHash: "h2" });
    const theirs = await branches.create({ ownerId: "o2", name: "C", slug: "c", cashierTokenHash: "h3" });
    if (mine.kind !== "created" || mine2.kind !== "created" || theirs.kind !== "created") throw new Error();

    const asked: string[][] = [];
    const rows: StatsOrder[] = [
      { status: "DONE", createdAt: new Date("2026-10-28T09:00:00Z"), readyAt: null, doneAt: null, claimedAt: null },
    ];
    const stats: StatsRepository = {
      async listOrders(ids) {
        asked.push(ids);
        return rows;
      },
    };
    const service = createStatsService({ branches, stats, now: () => NOW });
    return { service, asked, mine: mine.shop, mine2: mine2.shop, theirs: theirs.shop };
  }

  it("asks for all of the owner's branches, and only theirs", async () => {
    const { service, asked, mine, mine2 } = await setup();
    const result = await service.getStats("o1", { range: "7d" });
    expect(asked[0].sort()).toEqual([mine.id, mine2.id].sort());
    expect(result.orders).toBe(1);
  });

  it("can narrow to one branch", async () => {
    const { service, asked, mine } = await setup();
    await service.getStats("o1", { range: "today", shopId: mine.id });
    expect(asked[0]).toEqual([mine.id]);
  });

  it("refuses another owner's branch", async () => {
    const { service, theirs } = await setup();
    await expect(service.getStats("o1", { range: "7d", shopId: theirs.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
      reason: "BRANCH_NOT_FOUND",
    });
  });
});
