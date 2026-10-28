import type { Owner } from "@/domain/owner";

export interface OwnerWithPassword extends Owner {
  passwordHash: string;
}

export type CreateOwnerResult =
  | { kind: "created"; owner: Owner }
  | { kind: "email_taken" };

export interface OwnerRepository {
  // The database's UNIQUE rule on email is the real guard against two people
  // registering the same address at the same moment.
  create(input: { email: string; passwordHash: string }): Promise<CreateOwnerResult>;
  findByEmail(email: string): Promise<OwnerWithPassword | null>;
}

export interface SessionRepository {
  create(input: { ownerId: string; tokenHash: string; expiresAt: Date }): Promise<void>;
  // Returns the owner only if the session exists and has not expired.
  findOwnerByTokenHash(tokenHash: string, now: Date): Promise<Owner | null>;
  deleteByTokenHash(tokenHash: string): Promise<void>;
}
