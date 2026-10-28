import { describe, expect, it } from "vitest";
import ar from "../../messages/ar.json";
import en from "../../messages/en.json";

// Turns { a: { b: "x" } } into { "a.b": "x" } so two languages are comparable.
function flatten(
  object: Record<string, unknown>,
  prefix = "",
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(object)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out[path] = value;
    else Object.assign(out, flatten(value as Record<string, unknown>, path));
  }
  return out;
}

// {number} and {shop} inside a text: these must match in every language.
const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

const english = flatten(en);
const arabic = flatten(ar);

describe("translations", () => {
  it("Arabic has exactly the same keys as English", () => {
    expect(Object.keys(arabic).sort()).toEqual(Object.keys(english).sort());
  });

  it("no text is empty", () => {
    for (const [key, text] of [
      ...Object.entries(english),
      ...Object.entries(arabic),
    ]) {
      expect(text.trim(), key).not.toBe("");
    }
  });

  it("both languages use the same {placeholders} in every text", () => {
    for (const key of Object.keys(english)) {
      expect(placeholders(arabic[key]), key).toEqual(placeholders(english[key]));
    }
  });

  it("every Arabic text contains Arabic (except labels that are only symbols or a name)", () => {
    const hasArabic = /[\u0600-\u06FF]/;
    const exceptions = new Set([
      "common.switchTo", // "English", the other language's name
      "claim.placeholder", // the example number 27
      "tracker.titleWaiting", // "#27 - <shop name>"
      "poster.sizes.a4", // paper sizes are written the same in Arabic
      "poster.sizes.a5",
      "dashboard.readout", // only placeholders and a dot
    ]);
    for (const [key, text] of Object.entries(arabic)) {
      if (exceptions.has(key)) continue;
      expect(text, key).toMatch(hasArabic);
    }
  });

  it("every error reason the server can send has a text", () => {
    const reasons = [
      "NUMBER_IN_USE",
      "ORDER_CHANGED",
      "REOPEN_NUMBER_TAKEN",
      "ONLY_PENDING_CANCEL",
      "INVALID_TRANSITION",
      "ORDER_NOT_FOUND",
      "SHOP_NOT_FOUND",
      "NOTHING_TO_CLAIM",
      "NO_OPEN_ORDER",
      "ALREADY_CLAIMED",
      "ALREADY_COLLECTED",
      "INVALID_EMAIL",
      "WEAK_PASSWORD",
      "EMAIL_TAKEN",
      "INVALID_CREDENTIALS",
      "UNAUTHORIZED",
      "INVALID_NAME",
      "TOO_MANY_BRANCHES",
      "SLUG_UNAVAILABLE",
      "BRANCH_NOT_FOUND",
      "generic",
      "offline",
    ];
    for (const reason of reasons) {
      expect(english[`errors.${reason}`], reason).toBeDefined();
      expect(arabic[`errors.${reason}`], reason).toBeDefined();
    }
  });
});
