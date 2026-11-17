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
        select: { id: true, email: true, activeUntil: true, phone: true },
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
      select: { id: true, email: true, activeUntil: true, phone: true, passwordHash: true },
    });
  }

  findById(id: string): Promise<OwnerWithPassword | null> {
    return getPrisma().owner.findUnique({
      where: { id },
      select: { id: true, email: true, activeUntil: true, phone: true, passwordHash: true },
    });
  }

  async updatePhone(id: string, phone: string | null): Promise<void> {
    await getPrisma().owner.update({ where: { id }, data: { phone } });
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await getPrisma().owner.update({ where: { id }, data: { passwordHash } });
  }
}

export class PrismaSessionRepository implements SessionRepository {
  async create(input: { ownerId: string; tokenHash: string; expiresAt: Date }): Promise<void> {
    await getPrisma().ownerSession.create({ data: input });
  }

  async findOwnerByTokenHash(tokenHash: string, now: Date): Promise<Owner | null> {
    const session = await getPrisma().ownerSession.findUnique({
      where: { tokenHash },
      select: {
        expiresAt: true,
        owner: { select: { id: true, email: true, activeUntil: true, phone: true } },
      },
    });
    if (!session || session.expiresAt <= now) return null;
    return session.owner;
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    await getPrisma().ownerSession.deleteMany({ where: { tokenHash } });
  }

  async deleteOthers(ownerId: string, keepTokenHash: string): Promise<void> {
    await getPrisma().ownerSession.deleteMany({
      where: { ownerId, tokenHash: { not: keepTokenHash } },
    });
  }
}
