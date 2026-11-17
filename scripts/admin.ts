import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { normalizeEmail } from "../src/domain/owner";
import { generateTemporaryPassword, hashPassword } from "../src/domain/password";
import {
  GRACE_DAYS,
  extendSubscription,
  subscriptionState,
} from "../src/domain/subscription";
import { PrismaClient } from "../src/generated/prisma/client";

// Your admin tool. It runs on YOUR computer (never on the website), so there
// is no admin page for anyone else to find or attack.
//
//   npm run admin -- list
//   npm run admin -- activate owner@cafe.jo 1      (1 = months; default 1)
//   npm run admin -- activate owner@cafe.jo 12     (a yearly payment)
//   npm run admin -- deactivate owner@cafe.jo      (stops the cashier now)
//   npm run admin -- reset-password owner@cafe.jo  (temporary password, see below)
//   npm run admin -- reset-password owner@cafe.jo --print-sql
//
// reset-password: makes a random temporary password, replaces the owner's
// password with it, ends all their logins, and makes them choose a new
// password at their next login. The temporary password is printed once: send
// it to them on WhatsApp. With --print-sql nothing is changed here; you get the
// two SQL statements to paste into the Neon SQL Editor yourself.
//
// Which database it changes is decided by DIRECT_URL (or DATABASE_URL) in the
// .env file. The tool always prints the database it is talking to first, so
// you can see whether it is your local test database or the real one.

const DAY_MS = 24 * 60 * 60 * 1000;

// Dates shown in Jordan time, because that is the clock your customers use.
function show(date: Date | null): string {
  if (!date) return "-";
  return date.toLocaleString("en-GB", {
    timeZone: "Asia/Amman",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function usage(): never {
  console.log(`Usage:
  npm run admin -- list
  npm run admin -- activate <email> [months]
  npm run admin -- deactivate <email>
  npm run admin -- reset-password <email> [--print-sql]`);
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  const printSql = args.includes("--print-sql");
  const [command, rawEmail, rawMonths] = args.filter((a) => a !== "--print-sql");
  if (!command) usage();

  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DIRECT_URL / DATABASE_URL is not set");

  // Print only the host (never the password) so you know where you are.
  console.log(`Database: ${new URL(connectionString).host}\n`);

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const now = new Date();

    if (command === "list") {
      const owners = await prisma.owner.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          email: true,
          phone: true,
          activeUntil: true,
          createdAt: true,
          _count: { select: { shops: true } },
        },
      });
      if (owners.length === 0) console.log("No accounts yet.");
      for (const o of owners) {
        const state = subscriptionState(o.activeUntil, now).toUpperCase();
        console.log(
          `${state.padEnd(8)} ${o.email.padEnd(34)} until ${show(o.activeUntil).padEnd(22)} ` +
            `phone ${(o.phone ?? "-").padEnd(14)} ` +
            `branches ${o._count.shops}  signed up ${show(o.createdAt)}`,
        );
      }
      return;
    }

    if (command !== "activate" && command !== "deactivate" && command !== "reset-password") usage();
    if (!rawEmail) usage();
    const email = normalizeEmail(rawEmail);
    const owner = await prisma.owner.findUnique({
      where: { email },
      select: { id: true, activeUntil: true },
    });
    if (!owner) {
      console.error(`No account with the email ${email}`);
      process.exit(1);
    }

    if (command === "reset-password") {
      const temporary = generateTemporaryPassword();
      const hash = await hashPassword(temporary);
      if (printSql) {
        // The hash only has letters, digits, $ + / = so it is safe in quotes.
        console.log(`Paste these in the Neon SQL Editor (run both together):\n`);
        console.log(`UPDATE "Owner" SET "passwordHash" = '${hash}', "mustChangePassword" = true WHERE "email" = '${email}';`);
        console.log(`DELETE FROM "OwnerSession" WHERE "ownerId" = (SELECT "id" FROM "Owner" WHERE "email" = '${email}');`);
        console.log(`\nNothing was changed yet.`);
      } else {
        await prisma.$transaction([
          prisma.owner.update({
            where: { id: owner.id },
            data: { passwordHash: hash, mustChangePassword: true },
          }),
          prisma.ownerSession.deleteMany({ where: { ownerId: owner.id } }),
        ]);
        console.log(`${email}: password reset, all logins ended.`);
      }
      console.log(`\nTemporary password: ${temporary}`);
      console.log(`Send it on WhatsApp. They must choose their own at the next login.`);
    } else if (command === "activate") {
      const months = rawMonths === undefined ? 1 : Number(rawMonths);
      if (!Number.isInteger(months) || months < 1 || months > 36) {
        console.error("Months must be a whole number from 1 to 36");
        process.exit(1);
      }
      const activeUntil = extendSubscription(owner.activeUntil, now, months);
      await prisma.owner.update({ where: { id: owner.id }, data: { activeUntil } });
      console.log(`${email}: active until ${show(activeUntil)} (+${months} month${months > 1 ? "s" : ""})`);
    } else {
      // Past the grace period, so the cashier stops right away.
      const activeUntil = new Date(now.getTime() - (GRACE_DAYS + 1) * DAY_MS);
      await prisma.owner.update({ where: { id: owner.id }, data: { activeUntil } });
      console.log(`${email}: deactivated. Their data is kept; "activate" turns it back on.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
