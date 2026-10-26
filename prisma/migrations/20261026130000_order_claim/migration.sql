-- Adds the customer link secret and the "a phone is linked" timestamp.
-- Existing rows get a random token so the column can be NOT NULL + UNIQUE.

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "claimToken" TEXT,
ADD COLUMN     "claimedAt" TIMESTAMP(3);

-- Backfill: one random token per existing order.
UPDATE "Order"
SET "claimToken" = md5(random()::text || clock_timestamp()::text || "id")
WHERE "claimToken" IS NULL;

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "claimToken" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Order_claimToken_key" ON "Order"("claimToken");
