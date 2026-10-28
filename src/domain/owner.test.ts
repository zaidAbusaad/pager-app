import { describe, expect, it } from "vitest";
import { isAcceptablePassword, isValidEmail, normalizeEmail } from "./owner";
import { hashPassword, verifyPassword } from "./password";

describe("owner rules", () => {
  it("normalizes email case and spaces", () => {
    expect(normalizeEmail("  Ali@Mail.COM ")).toBe("ali@mail.com");
  });

  it.each(["a@b.co", "first.last@shop.example.jo"])("accepts %s", (e) => {
    expect(isValidEmail(e)).toBe(true);
  });

  it.each(["", "abc", "a@b", "a b@c.d", "@x.y", "a@@b.c"])("rejects %j", (e) => {
    expect(isValidEmail(e)).toBe(false);
  });

  it("limits password length", () => {
    expect(isAcceptablePassword("1234567")).toBe(false);
    expect(isAcceptablePassword("12345678")).toBe(true);
    expect(isAcceptablePassword("x".repeat(128))).toBe(true);
    expect(isAcceptablePassword("x".repeat(129))).toBe(false);
  });
});

describe("password hashing", () => {
  it("verifies the right password and rejects others", async () => {
    const stored = await hashPassword("correct horse");
    expect(stored.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse", stored)).toBe(true);
    expect(await verifyPassword("wrong", stored)).toBe(false);
  });

  it("salts: the same password hashes differently each time", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });

  it("rejects malformed stored values instead of crashing", async () => {
    expect(await verifyPassword("x", "garbage")).toBe(false);
  });
});
