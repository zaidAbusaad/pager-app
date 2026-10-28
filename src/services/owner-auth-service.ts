import { DomainError } from "@/domain/errors";
import {
  type Owner,
  isAcceptablePassword,
  isValidEmail,
  normalizeEmail,
} from "@/domain/owner";
import { hashPassword, verifyPassword } from "@/domain/password";
import {
  SESSION_TTL_MS,
  generateSessionToken,
  hashSessionToken,
} from "@/domain/session-token";
import type { OwnerRepository, SessionRepository } from "@/repositories/owner-repository";

const MAX_TOKEN_LENGTH = 200;

export interface LoginResult {
  owner: Owner;
  sessionToken: string; // goes into the cookie, never into the database
  expiresAt: Date;
}

interface Deps {
  owners: OwnerRepository;
  sessions: SessionRepository;
  now?: () => Date;
}

export function createOwnerAuthService({ owners, sessions, now = () => new Date() }: Deps) {
  async function startSession(owner: Owner): Promise<LoginResult> {
    const { token, hash } = generateSessionToken();
    const expiresAt = new Date(now().getTime() + SESSION_TTL_MS);
    await sessions.create({ ownerId: owner.id, tokenHash: hash, expiresAt });
    return { owner, sessionToken: token, expiresAt };
  }

  // A real hash of a password nobody has. When the email is unknown we still
  // verify against it, so "no such account" and "wrong password" take the same
  // time and an attacker cannot use the clock to discover which emails exist.
  let dummyHash: Promise<string> | undefined;

  return {
    async register(input: { email: string; password: string }): Promise<LoginResult> {
      const email = normalizeEmail(input.email);
      if (!isValidEmail(email)) {
        throw new DomainError("INVALID_INPUT", "Invalid email", { reason: "INVALID_EMAIL" });
      }
      if (!isAcceptablePassword(input.password)) {
        throw new DomainError("INVALID_INPUT", "Password must be 8-128 characters", {
          reason: "WEAK_PASSWORD",
        });
      }
      const result = await owners.create({
        email,
        passwordHash: await hashPassword(input.password),
      });
      if (result.kind === "email_taken") {
        throw new DomainError("CONFLICT", "Email already registered", { reason: "EMAIL_TAKEN" });
      }
      return startSession(result.owner);
    },

    async login(input: { email: string; password: string }): Promise<LoginResult> {
      const deny = () =>
        new DomainError("UNAUTHORIZED", "Wrong email or password", {
          reason: "INVALID_CREDENTIALS",
        });
      if (input.password.length > 1024) throw deny();

      const found = await owners.findByEmail(normalizeEmail(input.email));
      dummyHash ??= hashPassword("not-a-real-password");
      const ok = await verifyPassword(input.password, found?.passwordHash ?? (await dummyHash));
      if (!found || !ok) throw deny();
      return startSession({ id: found.id, email: found.email });
    },

    // Turns the cookie's secret into the logged-in owner, or throws.
    async authenticate(token: string | null | undefined): Promise<Owner> {
      const deny = () => new DomainError("UNAUTHORIZED", "Not logged in");
      if (!token || token.length > MAX_TOKEN_LENGTH) throw deny();
      const owner = await sessions.findOwnerByTokenHash(hashSessionToken(token), now());
      if (!owner) throw deny();
      return owner;
    },

    async logout(token: string | null | undefined): Promise<void> {
      if (!token || token.length > MAX_TOKEN_LENGTH) return;
      await sessions.deleteByTokenHash(hashSessionToken(token));
    },
  };
}

export type OwnerAuthService = ReturnType<typeof createOwnerAuthService>;
