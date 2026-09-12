-- AlterTable
ALTER TABLE "Order" ADD COLUMN "cancelReason" TEXT;
ALTER TABLE "Order" ADD COLUMN "canceledAt" DATETIME;
ALTER TABLE "Order" ADD COLUMN "depositorName" TEXT;

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
    "shippingFee" INTEGER NOT NULL DEFAULT 3000,
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
INSERT INTO "new_Setting" ("bankAccount", "chatUrl", "contactPhone", "courierCustomerCode", "courierLoginId", "courierName", "courierSiteUrl", "id", "kakaoChannelUrl", "logoUrl", "noticeText", "ownerName", "senderAddress", "senderAddressDetail", "senderZipcode", "shopName", "trackingUrlTemplate", "updatedAt") SELECT "bankAccount", "chatUrl", "contactPhone", "courierCustomerCode", "courierLoginId", "courierName", "courierSiteUrl", "id", "kakaoChannelUrl", "logoUrl", "noticeText", "ownerName", "senderAddress", "senderAddressDetail", "senderZipcode", "shopName", "trackingUrlTemplate", "updatedAt" FROM "Setting";
DROP TABLE "Setting";
ALTER TABLE "new_Setting" RENAME TO "Setting";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
