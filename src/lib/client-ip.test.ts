import { describe, expect, it } from "vitest";
import { clientIp } from "./client-ip";

const headers = (init: Record<string, string>) => new Headers(init);

describe("clientIp", () => {
  it("takes the first address of x-forwarded-for", () => {
    expect(clientIp(headers({ "x-forwarded-for": "9.9.9.9, 10.0.0.1" }))).toBe("9.9.9.9");
  });
  it("falls back to x-real-ip", () => {
    expect(clientIp(headers({ "x-real-ip": "8.8.8.8" }))).toBe("8.8.8.8");
  });
  it("uses 'unknown' when no proxy header exists", () => {
    expect(clientIp(headers({}))).toBe("unknown");
  });
});
