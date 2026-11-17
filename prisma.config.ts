import "dotenv/config";
import { defineConfig } from "prisma/config";

// Settings for the Prisma CLI (generate, migrate, seed).
// `dotenv/config` loads the .env file, because the CLI does not do that on
// its own anymore.
//
// Two connection strings, two jobs:
//  - DIRECT_URL   talks straight to Postgres. Migrations need this, because
//                 they use features a connection pooler may not support.
//  - DATABASE_URL goes through a pooler (a doorman that shares a few real
//                 connections between many short-lived requests). The running
//                 app uses this one, see src/lib/db.ts.
// Locally there is no pooler, so DIRECT_URL can stay unset: we fall back to
// DATABASE_URL.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
