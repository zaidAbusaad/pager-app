/*
  Warnings:

  - A unique constraint covering the columns `[cashierTokenHash]` on the table `Shop` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "cashierTokenHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Shop_cashierTokenHash_key" ON "Shop"("cashierTokenHash");
