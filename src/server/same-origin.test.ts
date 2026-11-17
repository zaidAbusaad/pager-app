import { describe, expect, it } from "vitest";
import { assertSameOrigin } from "./same-origin";

const req = (headers: Record<string, string>) => ({ headers: new Headers(headers) });

describe("assertSameOrigin", () => {
  it("lets a request from our own pages through", () => {
    expect(() =>
      assertSameOrigin(req({ origin: "https://pagerlyjo.app", host: "pagerlyjo.app" })),
    ).not.toThrow();
    expect(() =>
      assertSameOrigin(req({ origin: "http://localhost:3000", host: "localhost:3000" })),
    ).not.toThrow();
  });

  it("lets requests with no Origin header through (curl, scripts)", () => {
    expect(() => assertSameOrigin(req({ host: "pagerlyjo.app" }))).not.toThrow();
  });

  it("refuses a request that came from another website", () => {
    expect(() =>
      assertSameOrigin(req({ origin: "https://evil.example", host: "pagerlyjo.app" })),
    ).toThrowError(expect.objectContaining({ code: "FORBIDDEN" }));
  });

  it("refuses look-alike hosts and the literal 'null' origin", () => {
    expect(() =>
      assertSameOrigin(req({ origin: "https://pagerlyjo.app.evil.example", host: "pagerlyjo.app" })),
    ).toThrow();
    expect(() => assertSameOrigin(req({ origin: "null", host: "pagerlyjo.app" }))).toThrow();
  });
});
