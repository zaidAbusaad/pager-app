import { DomainError } from "@/domain/errors";
import {
  type Owner,
  isAcceptablePassword,
  isValidEmail,
  normalizeEmail,
  normalizePhone,
} from "@/domain/owner";
import { TEMPORARY_HASH_PREFIX, hashPassword, verifyPassword } from "@/domain/password";
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
      // a temporary (SQL-made) password only counts on an account flagged for reset
      if (found.passwordHash.startsWith(TEMPORARY_HASH_PREFIX) && !found.mustChangePassword) {
        throw deny();
      }
      return startSession({
        id: found.id,
        email: found.email,
        activeUntil: found.activeUntil,
        phone: found.phone,
        mustChangePassword: found.mustChangePassword,
      });
    },

    // Turns the cookie's secret into the logged-in owner, or throws.
    async authenticate(token: string | null | undefined): Promise<Owner> {
      const deny = () => new DomainError("UNAUTHORIZED", "Not logged in");
      if (!token || token.length > MAX_TOKEN_LENGTH) throw deny();
      const owner = await sessions.findOwnerByTokenHash(hashSessionToken(token), now());
      if (!owner) throw deny();
      return owner;
    },

    // Saves the contact number. An empty box removes it.
    async updatePhone(ownerId: string, raw: string): Promise<string | null> {
      const trimmed = raw.trim();
      const phone = trimmed === "" ? null : normalizePhone(trimmed);
      if (trimmed !== "" && phone === null) {
        throw new DomainError("INVALID_INPUT", "Invalid phone number", {
          reason: "INVALID_PHONE",
        });
      }
      await owners.updatePhone(ownerId, phone);
      return phone;
    },

    // Needs the current password (a stolen session alone must not be enough to
    // lock the real owner out). Every OTHER login is ended; this one stays.
    async changePassword(
      ownerId: string,
      sessionToken: string,
      input: { currentPassword: string; newPassword: string },
    ): Promise<void> {
      const found = await owners.findById(ownerId);
      const wrong = () =>
        new DomainError("INVALID_INPUT", "Current password is wrong", {
          reason: "WRONG_CURRENT_PASSWORD",
        });
      if (!found || input.currentPassword.length > 1024) throw wrong();
      if (!(await verifyPassword(input.currentPassword, found.passwordHash))) throw wrong();
      if (!isAcceptablePassword(input.newPassword)) {
        throw new DomainError("INVALID_INPUT", "Password must be 8-128 characters", {
          reason: "WEAK_PASSWORD",
        });
      }
      await owners.updatePasswordHash(ownerId, await hashPassword(input.newPassword));
      await sessions.deleteOthers(ownerId, hashSessionToken(sessionToken));
    },

    async logout(token: string | null | undefined): Promise<void> {
      if (!token || token.length > MAX_TOKEN_LENGTH) return;
      await sessions.deleteByTokenHash(hashSessionToken(token));
    },
  };
}

export type OwnerAuthService = ReturnType<typeof createOwnerAuthService>;
