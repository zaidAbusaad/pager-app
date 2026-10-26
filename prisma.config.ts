import "dotenv/config";
import { defineConfig } from "prisma/config";

// Settings for the Prisma CLI (generate, migrate, seed).
// `dotenv/config` loads DATABASE_URL from the .env file, because the CLI
// does not do that on its own anymore.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
