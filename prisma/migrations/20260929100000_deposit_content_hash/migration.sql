-- AlterTable
ALTER TABLE "DepositNotification" ADD COLUMN "contentHash" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "DepositNotification_shopId_contentHash_createdAt_idx" ON "DepositNotification"("shopId", "contentHash", "createdAt");
