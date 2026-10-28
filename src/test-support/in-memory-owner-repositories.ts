import type { Owner } from "@/domain/owner";
import type {
  CreateOwnerResult,
  OwnerRepository,
  OwnerWithPassword,
  SessionRepository,
} from "@/repositories/owner-repository";

// Fakes that keep accounts and sessions in memory. Used only by tests.
export class InMemoryOwnerRepository implements OwnerRepository {
  owners = new Map<string, OwnerWithPassword>();
  private sequence = 0;

  async create(input: { email: string; passwordHash: string }): Promise<CreateOwnerResult> {
    if (this.owners.has(input.email)) return { kind: "email_taken" };
    const owner = { id: `owner-${++this.sequence}`, ...input };
    this.owners.set(input.email, owner);
    return { kind: "created", owner: { id: owner.id, email: owner.email } };
  }

  async findByEmail(email: string) {
    return this.owners.get(email) ?? null;
  }
}

export class InMemorySessionRepository implements SessionRepository {
  sessions = new Map<string, { ownerId: string; expiresAt: Date }>();

  constructor(private readonly owners: InMemoryOwnerRepository) {}

  async create(input: { ownerId: string; tokenHash: string; expiresAt: Date }) {
    this.sessions.set(input.tokenHash, {
      ownerId: input.ownerId,
      expiresAt: input.expiresAt,
    });
  }

  async findOwnerByTokenHash(tokenHash: string, now: Date): Promise<Owner | null> {
    const session = this.sessions.get(tokenHash);
    if (!session || session.expiresAt <= now) return null;
    const owner = [...this.owners.owners.values()].find((o) => o.id === session.ownerId);
    return owner ? { id: owner.id, email: owner.email } : null;
  }

  async deleteByTokenHash(tokenHash: string) {
    this.sessions.delete(tokenHash);
  }
}
