import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { normalizeEmail } from "../src/domain/owner";
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
  npm run admin -- deactivate <email>`);
  process.exit(1);
}

async function main() {
  const [command, rawEmail, rawMonths] = process.argv.slice(2);
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
            `branches ${o._count.shops}  signed up ${show(o.createdAt)}`,
        );
      }
      return;
    }

    if (command !== "activate" && command !== "deactivate") usage();
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

    if (command === "activate") {
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
