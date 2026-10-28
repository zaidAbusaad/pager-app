import { Prisma } from "@/generated/prisma/client";
import type { Owner } from "@/domain/owner";
import { getPrisma } from "@/lib/db";
import type {
  CreateOwnerResult,
  OwnerRepository,
  OwnerWithPassword,
  SessionRepository,
} from "./owner-repository";

export class PrismaOwnerRepository implements OwnerRepository {
  async create(input: { email: string; passwordHash: string }): Promise<CreateOwnerResult> {
    try {
      const owner = await getPrisma().owner.create({
        data: input,
        select: { id: true, email: true },
      });
      return { kind: "created", owner };
    } catch (error) {
      // P2002 = "unique constraint failed": that email already exists.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return { kind: "email_taken" };
      }
      throw error;
    }
  }

  findByEmail(email: string): Promise<OwnerWithPassword | null> {
    return getPrisma().owner.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true },
    });
  }
}

export class PrismaSessionRepository implements SessionRepository {
  async create(input: { ownerId: string; tokenHash: string; expiresAt: Date }): Promise<void> {
    await getPrisma().ownerSession.create({ data: input });
  }

  async findOwnerByTokenHash(tokenHash: string, now: Date): Promise<Owner | null> {
    const session = await getPrisma().ownerSession.findUnique({
      where: { tokenHash },
      select: { expiresAt: true, owner: { select: { id: true, email: true } } },
    });
    if (!session || session.expiresAt <= now) return null;
    return session.owner;
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    await getPrisma().ownerSession.deleteMany({ where: { tokenHash } });
  }
}
