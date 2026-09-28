-- AlterTable
ALTER TABLE "Shop" ADD COLUMN "notifySecretHash" TEXT;
ALTER TABLE "Shop" ADD COLUMN "notifySecretIssuedAt" DATETIME;
ALTER TABLE "Shop" ADD COLUMN "lastNotifyReceivedAt" DATETIME;

-- CreateIndex
CREATE UNIQUE INDEX "Shop_notifySecretHash_key" ON "Shop"("notifySecretHash");

-- CreateTable
CREATE TABLE "DepositNotification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopId" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "dedupeHash" TEXT NOT NULL,
    "receivedAt" DATETIME NOT NULL,
    "rawTextMasked" TEXT,
    "extractedAmount" INTEGER,
    "extractedName" TEXT,
    "extractionInvalid" BOOLEAN NOT NULL DEFAULT false,
    "matchType" TEXT NOT NULL,
    "settlementIds" TEXT NOT NULL DEFAULT '[]',
    "matchedUserId" INTEGER,
    "matchedCustomerName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "autoConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DepositNotification_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DepositNotification_dedupeHash_key" ON "DepositNotification"("dedupeHash");

-- CreateIndex
CREATE INDEX "DepositNotification_shopId_status_idx" ON "DepositNotification"("shopId", "status");
