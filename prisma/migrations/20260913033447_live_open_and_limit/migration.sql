-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "salePrice" INTEGER,
    "cost" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT NOT NULL DEFAULT '의류',
    "description" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isOpen" BOOLEAN NOT NULL DEFAULT false,
    "openedAt" DATETIME,
    "closedAt" DATETIME,
    "limitPerPerson" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Product" ("category", "cost", "createdAt", "description", "id", "imageUrl", "isActive", "name", "price", "salePrice", "updatedAt") SELECT "category", "cost", "createdAt", "description", "id", "imageUrl", "isActive", "name", "price", "salePrice", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
