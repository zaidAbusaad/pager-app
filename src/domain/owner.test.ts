import { describe, expect, it } from "vitest";
import { isAcceptablePassword, isValidEmail, normalizeEmail, normalizePhone } from "./owner";
import { generateTemporaryPassword, hashPassword, verifyPassword } from "./password";

describe("normalizePhone", () => {
  it.each([
    "0791234567",
    "791234567",
    "+962 79 123 4567",
    "00962-79-123-4567",
    "962791234567",
    "٠٧٩١٢٣٤٥٦٧",
  ])("turns %s into the stored form", (raw) => {
    expect(normalizePhone(raw)).toBe("+962791234567");
  });

  it.each(["", "12345", "0661234567", "07912345", "079123456789", "abc"])(
    "refuses %s",
    (raw) => {
      expect(normalizePhone(raw)).toBeNull();
    },
  );
});

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

describe("generateTemporaryPassword", () => {
  it("makes three groups of four easy-to-read characters", () => {
    expect(generateTemporaryPassword()).toMatch(/^[a-km-zA-HJ-NP-Z2-9]{4}-[a-km-zA-HJ-NP-Z2-9]{4}-[a-km-zA-HJ-NP-Z2-9]{4}$/);
  });

  it("is different every time and acceptable as a password", () => {
    const a = generateTemporaryPassword();
    expect(a).not.toBe(generateTemporaryPassword());
    expect(isAcceptablePassword(a)).toBe(true);
  });
});
