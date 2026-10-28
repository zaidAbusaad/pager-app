import { describe, expect, it } from "vitest";
import { POSTER_COLORS, POSTER_SIZES, POSTER_TEXTS } from "./poster";

describe("poster options", () => {
  it("A4 and A5 share the same paper shape (so one layout fits both)", () => {
    const ratio = (s: { width: number; height: number }) => s.height / s.width;
    expect(ratio(POSTER_SIZES.a4)).toBeCloseTo(ratio(POSTER_SIZES.a5), 1);
  });

  it("10 cm is a square", () => {
    expect(POSTER_SIZES.s10.width).toBe(POSTER_SIZES.s10.height);
  });

  it("colours are valid hex codes", () => {
    for (const c of POSTER_COLORS) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("has texts in both languages", () => {
    expect(POSTER_TEXTS.ar.headline).toMatch(/[؀-ۿ]/);
    expect(POSTER_TEXTS.en.headline.length).toBeGreaterThan(0);
  });
});
