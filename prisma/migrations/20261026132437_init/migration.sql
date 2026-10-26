-- DropIndex
DROP INDEX "Order_shopId_number_key";

-- CreateIndex
CREATE INDEX "Order_shopId_number_idx" ON "Order"("shopId", "number");
