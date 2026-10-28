import { beforeEach, describe, expect, it } from "vitest";
import { hashCashierToken } from "@/domain/cashier-token";
import { MAX_BRANCHES_PER_OWNER } from "@/domain/shop";
import { InMemoryOwnerShopRepository } from "@/test-support/in-memory-owner-shop-repository";
import { createBranchService } from "./branch-service";

let repo: InMemoryOwnerShopRepository;
let branches: ReturnType<typeof createBranchService>;
let n = 0;

beforeEach(() => {
  repo = new InMemoryOwnerShopRepository();
  n = 0;
  branches = createBranchService({ shops: repo, suffix: () => `s${++n}` });
});

describe("createBranch", () => {
  it("creates a branch with a clean slug and returns the cashier secret once", async () => {
    const { shop, cashierToken } = await branches.createBranch("o1", { name: "  Demo  Cafe " });
    expect(shop).toMatchObject({ name: "Demo Cafe", slug: "demo-cafe" });
    // only the HASH is stored
    expect(repo.rows[0].cashierTokenHash).toBe(hashCashierToken(cashierToken));
    expect(JSON.stringify(repo.rows)).not.toContain(cashierToken);
  });

  it("adds a suffix when the slug is taken, even by another owner", async () => {
    await branches.createBranch("o1", { name: "Demo Cafe" });
    const { shop } = await branches.createBranch("o2", { name: "Demo Cafe" });
    expect(shop.slug).toBe("demo-cafe-s1");
  });

  it("gives Arabic-only names a generated slug", async () => {
    const { shop } = await branches.createBranch("o1", { name: "مقهى الوادي" });
    expect(shop.name).toBe("مقهى الوادي");
    expect(shop.slug).toBe("shop-s1");
  });

  it("rejects empty and too-long names", async () => {
    for (const name of ["   ", "x".repeat(61)]) {
      await expect(branches.createBranch("o1", { name })).rejects.toMatchObject({
        code: "INVALID_INPUT",
        reason: "INVALID_NAME",
      });
    }
  });

  it("enforces the branch limit per owner", async () => {
    for (let i = 0; i < MAX_BRANCHES_PER_OWNER; i++) {
      await branches.createBranch("o1", { name: `Shop ${i}` });
    }
    await expect(branches.createBranch("o1", { name: "One more" })).rejects.toMatchObject({
      reason: "TOO_MANY_BRANCHES",
    });
    await expect(branches.createBranch("o2", { name: "Other owner" })).resolves.toBeDefined();
  });
});

describe("listBranches", () => {
  it("only lists the owner's own branches", async () => {
    await branches.createBranch("o1", { name: "A" });
    await branches.createBranch("o2", { name: "B" });
    expect((await branches.listBranches("o1")).map((s) => s.name)).toEqual(["A"]);
  });
});

describe("rotateCashierLink", () => {
  it("replaces the hash so the old link stops matching", async () => {
    const { shop, cashierToken } = await branches.createBranch("o1", { name: "A" });
    const { cashierToken: fresh } = await branches.rotateCashierLink("o1", shop.id);
    expect(fresh).not.toBe(cashierToken);
    expect(repo.rows[0].cashierTokenHash).toBe(hashCashierToken(fresh));
  });

  it("refuses another owner's branch", async () => {
    const { shop } = await branches.createBranch("o1", { name: "A" });
    await expect(branches.rotateCashierLink("o2", shop.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
      reason: "BRANCH_NOT_FOUND",
    });
  });
});
