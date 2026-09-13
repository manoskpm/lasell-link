-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "loginId" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "zipcode" TEXT,
    "address" TEXT,
    "addressDetail" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "pendingCouponId" INTEGER,
    "followedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_pendingCouponId_fkey" FOREIGN KEY ("pendingCouponId") REFERENCES "Coupon" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("address", "addressDetail", "createdAt", "followedAt", "id", "loginId", "name", "password", "phone", "role", "updatedAt", "zipcode") SELECT "address", "addressDetail", "createdAt", "followedAt", "id", "loginId", "name", "password", "phone", "role", "updatedAt", "zipcode" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_loginId_key" ON "User"("loginId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
