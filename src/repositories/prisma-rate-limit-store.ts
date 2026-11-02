import { getPrisma } from "@/lib/db";
import type { RateHit, RateLimitStore } from "./rate-limit-store";

// One SQL statement does everything, so it is atomic:
//  - no row yet, or the old window ended  -> start a new window with count 1
//  - otherwise                            -> add 1 to the count
export class PrismaRateLimitStore implements RateLimitStore {
  async hit(key: string, windowMs: number, nowMs: number): Promise<RateHit> {
    const prisma = getPrisma();
    const resetsAtMs = nowMs + windowMs;
    const rows = await prisma.$queryRaw<{ count: number; resetsAtMs: bigint }[]>`
      INSERT INTO "RateLimit" ("key", "count", "resetsAtMs")
      VALUES (${key}, 1, ${resetsAtMs}::bigint)
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimit"."resetsAtMs" <= ${nowMs}::bigint
                       THEN 1 ELSE "RateLimit"."count" + 1 END,
        "resetsAtMs" = CASE WHEN "RateLimit"."resetsAtMs" <= ${nowMs}::bigint
                            THEN ${resetsAtMs}::bigint
                            ELSE "RateLimit"."resetsAtMs" END
      RETURNING "count", "resetsAtMs"`;

    // Housekeeping: about 1 request in 50 also removes rows whose window ended.
    if (Math.random() < 0.02) {
      await prisma.$executeRaw`
        DELETE FROM "RateLimit" WHERE "resetsAtMs" < ${nowMs}::bigint`;
    }

    return { count: Number(rows[0].count), resetsAtMs: Number(rows[0].resetsAtMs) };
  }
}
