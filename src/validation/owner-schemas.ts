import { z } from "zod";
import { STATS_RANGES } from "@/domain/stats";

// Body of register and login. The real rules (email format, password length)
// live in the domain; here we only refuse absurdly large input early.
export const credentialsBody = z.object({
  email: z.string().max(320),
  password: z.string().max(1024),
});

export const createBranchBody = z.object({
  name: z.string().max(200),
});

export const branchParams = z.object({
  shopId: z.string().trim().min(1).max(64),
});

export const statsQuery = z.object({
  range: z.enum(STATS_RANGES).default("7d"),
  shopId: z.string().trim().min(1).max(64).optional(),
});
