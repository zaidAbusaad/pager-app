import { beforeEach, describe, expect, it } from "vitest";
import { SESSION_TTL_MS } from "@/domain/session-token";
import {
  InMemoryOwnerRepository,
  InMemorySessionRepository,
} from "@/test-support/in-memory-owner-repositories";
import { createOwnerAuthService } from "./owner-auth-service";

let time = new Date("2026-10-27T10:00:00Z");
let owners: InMemoryOwnerRepository;
let sessions: InMemorySessionRepository;
let auth: ReturnType<typeof createOwnerAuthService>;

beforeEach(() => {
  time = new Date("2026-10-27T10:00:00Z");
  owners = new InMemoryOwnerRepository();
  sessions = new InMemorySessionRepository(owners);
  auth = createOwnerAuthService({ owners, sessions, now: () => time });
});

const creds = { email: "Owner@Cafe.jo", password: "password123" };

describe("register", () => {
  it("creates the account, stores a hash, and logs the owner in", async () => {
    const result = await auth.register(creds);
    expect(result.owner.email).toBe("owner@cafe.jo");
    expect(owners.owners.get("owner@cafe.jo")?.passwordHash).not.toContain("password123");
    expect(result.expiresAt.getTime()).toBe(time.getTime() + SESSION_TTL_MS);
    await expect(auth.authenticate(result.sessionToken)).resolves.toEqual(result.owner);
  });

  it("never stores the raw session token", async () => {
    const { sessionToken } = await auth.register(creds);
    expect([...sessions.sessions.keys()]).not.toContain(sessionToken);
  });

  it("refuses a duplicate email, even in another case", async () => {
    await auth.register(creds);
    await expect(
      auth.register({ email: "OWNER@cafe.JO", password: "another-pass" }),
    ).rejects.toMatchObject({ code: "CONFLICT", reason: "EMAIL_TAKEN" });
  });

  it("validates email and password", async () => {
    await expect(auth.register({ email: "nope", password: "password123" })).rejects.toMatchObject({
      code: "INVALID_INPUT",
      reason: "INVALID_EMAIL",
    });
    await expect(auth.register({ email: "a@b.co", password: "short" })).rejects.toMatchObject({
      code: "INVALID_INPUT",
      reason: "WEAK_PASSWORD",
    });
  });
});

describe("login", () => {
  beforeEach(async () => {
    await auth.register(creds);
  });

  it("accepts the right password (email case-insensitive)", async () => {
    const result = await auth.login({ email: " OWNER@cafe.jo", password: "password123" });
    expect(result.owner.email).toBe("owner@cafe.jo");
  });

  it("gives the same error for a wrong password and an unknown email", async () => {
    const wrong = await auth.login({ email: creds.email, password: "bad-password" }).catch((e) => e);
    const unknown = await auth.login({ email: "x@y.co", password: "password123" }).catch((e) => e);
    expect(wrong).toMatchObject({ code: "UNAUTHORIZED", reason: "INVALID_CREDENTIALS" });
    expect(unknown.message).toBe(wrong.message);
    expect(unknown.reason).toBe(wrong.reason);
  });
});

describe("sessions", () => {
  it("expires after the TTL", async () => {
    const { sessionToken } = await auth.register(creds);
    time = new Date(time.getTime() + SESSION_TTL_MS);
    await expect(auth.authenticate(sessionToken)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("logout ends the session", async () => {
    const { sessionToken } = await auth.register(creds);
    await auth.logout(sessionToken);
    await expect(auth.authenticate(sessionToken)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it.each([null, undefined, "", "wrong", "x".repeat(500)])("rejects token %j", async (t) => {
    await expect(auth.authenticate(t)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
