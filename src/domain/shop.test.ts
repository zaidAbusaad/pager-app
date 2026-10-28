import { describe, expect, it } from "vitest";
import { isValidShopName, normalizeShopName, slugify } from "./shop";

describe("shop rules", () => {
  it.each([
    ["Demo Cafe", "demo-cafe"],
    ["Café Al-Wadi #2", "cafe-al-wadi-2"],
    ["  --Burger   House--  ", "burger-house"],
    ["مقهى الوادي", ""],
    ["مقهى Wadi", "wadi"],
  ])("slugify(%j) = %j", (name, slug) => {
    expect(slugify(name)).toBe(slug);
  });

  it("cuts long slugs without a trailing dash", () => {
    const slug = slugify("a".repeat(29) + " bbbbbb");
    expect(slug.length).toBeLessThanOrEqual(30);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("normalizes spaces and validates length", () => {
    expect(normalizeShopName("  Demo   Cafe ")).toBe("Demo Cafe");
    expect(isValidShopName("")).toBe(false);
    expect(isValidShopName("x".repeat(60))).toBe(true);
    expect(isValidShopName("x".repeat(61))).toBe(false);
  });
});
