-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settlement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER,
    "buyerName" TEXT NOT NULL,
    "buyerPhone" TEXT NOT NULL,
    "depositorName" TEXT,
    "zipcode" TEXT,
    "address" TEXT NOT NULL,
    "addressDetail" TEXT,
    "memo" TEXT,
    "paymentMethod" TEXT NOT NULL DEFAULT '계좌이체',
    "paymentStatus" TEXT NOT NULL DEFAULT '미입금',
    "shippingStatus" TEXT NOT NULL DEFAULT '접수전',
    "trackingNumber" TEXT,
    "shippingFee" INTEGER NOT NULL DEFAULT 0,
    "shippingCredit" INTEGER NOT NULL DEFAULT 0,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "couponId" INTEGER,
    "canceledAt" DATETIME,
    "cancelReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Settlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Settlement_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Settlement" ("address", "addressDetail", "buyerName", "buyerPhone", "cancelReason", "canceledAt", "couponId", "createdAt", "depositorName", "discount", "id", "memo", "paymentMethod", "paymentStatus", "shippingFee", "shippingStatus", "trackingNumber", "updatedAt", "userId", "zipcode") SELECT "address", "addressDetail", "buyerName", "buyerPhone", "cancelReason", "canceledAt", "couponId", "createdAt", "depositorName", "discount", "id", "memo", "paymentMethod", "paymentStatus", "shippingFee", "shippingStatus", "trackingNumber", "updatedAt", "userId", "zipcode" FROM "Settlement";
DROP TABLE "Settlement";
ALTER TABLE "new_Settlement" RENAME TO "Settlement";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
