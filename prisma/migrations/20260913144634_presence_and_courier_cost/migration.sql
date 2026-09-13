-- CreateTable
CREATE TABLE "Presence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER,
    "lastSeenAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Setting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "shopName" TEXT NOT NULL DEFAULT '내 상점',
    "logoUrl" TEXT,
    "ownerName" TEXT,
    "contactPhone" TEXT,
    "kakaoChannelUrl" TEXT,
    "chatUrl" TEXT,
    "bankAccount" TEXT,
    "noticeText" TEXT,
    "saleClosesAt" DATETIME,
    "lowStockAt" INTEGER NOT NULL DEFAULT 3,
    "shippingFee" INTEGER NOT NULL DEFAULT 3000,
    "courierCost" INTEGER NOT NULL DEFAULT 0,
    "freeShippingOver" INTEGER NOT NULL DEFAULT 0,
    "senderZipcode" TEXT,
    "senderAddress" TEXT,
    "senderAddressDetail" TEXT,
    "courierName" TEXT,
    "courierSiteUrl" TEXT,
    "courierLoginId" TEXT,
    "courierCustomerCode" TEXT,
    "trackingUrlTemplate" TEXT,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Setting" ("bankAccount", "chatUrl", "contactPhone", "courierCustomerCode", "courierLoginId", "courierName", "courierSiteUrl", "freeShippingOver", "id", "kakaoChannelUrl", "logoUrl", "lowStockAt", "noticeText", "ownerName", "saleClosesAt", "senderAddress", "senderAddressDetail", "senderZipcode", "shippingFee", "shopName", "trackingUrlTemplate", "updatedAt") SELECT "bankAccount", "chatUrl", "contactPhone", "courierCustomerCode", "courierLoginId", "courierName", "courierSiteUrl", "freeShippingOver", "id", "kakaoChannelUrl", "logoUrl", "lowStockAt", "noticeText", "ownerName", "saleClosesAt", "senderAddress", "senderAddressDetail", "senderZipcode", "shippingFee", "shopName", "trackingUrlTemplate", "updatedAt" FROM "Setting";
DROP TABLE "Setting";
ALTER TABLE "new_Setting" RENAME TO "Setting";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Presence_lastSeenAt_idx" ON "Presence"("lastSeenAt");
