import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { generateCashierToken } from "../src/domain/cashier-token";
import { PrismaClient } from "../src/generated/prisma/client";

// Creates one demo shop and gives it a NEW cashier link every time you run it
// (the old link stops working). "upsert" means update-or-insert.
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  const shop = await prisma.shop.upsert({
    where: { slug: "demo-cafe" },
    update: {},
    create: { name: "Demo Cafe", slug: "demo-cafe" },
  });

  // Only the hash is stored. The secret is shown once, here, and never again.
  const { token, hash } = generateCashierToken();
  await prisma.shop.update({
    where: { id: shop.id },
    data: { cashierTokenHash: hash },
  });

  console.log(`Demo shop ready: ${shop.name} (${shop.id})`);
  console.log(`Cashier link:    http://localhost:3000/c/${token}`);
  console.log(`Counter QR link (print this as a QR code): http://localhost:3000/s/${shop.slug}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
