-- 상점 정보 분리 (3단계): Setting(전역 1행) → Shop(셀러 소유) + Courier(운영자 관리) + PlatformSetting(운영 방침)
-- 순서: Courier/PlatformSetting 먼저 만들고 → Shop 표를 새 칸으로 재구성하며 기존 값 보존
--       → Setting에 있던 값을 Shop으로 복사 → 택배사 이름을 매칭해 Shop.courierId 채움
--       → CourierTemplate에 shopId 채움 → 다 옮긴 뒤 Setting 삭제

-- CreateTable
CREATE TABLE "Courier" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "siteUrl" TEXT,
    "trackingUrlTemplate" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "id" INTEGER NOT NULL PRIMARY KEY DEFAULT 1,
    "acceptingApplications" BOOLEAN NOT NULL DEFAULT true,
    "lowStockAtMin" INTEGER NOT NULL DEFAULT 1,
    "lowStockAtMax" INTEGER NOT NULL DEFAULT 10,
    "operatorContactKakaoUrl" TEXT,
    "operatorContactPhone" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- 기존에 코드에 박혀 있던 택배사 5곳을 운영자가 관리하는 목록으로 옮겨 심음
INSERT INTO "Courier" ("name", "siteUrl", "trackingUrlTemplate", "updatedAt") VALUES
    ('한진택배', 'https://www.hanjin.co.kr', 'https://www.hanjin.co.kr/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2={{번호}}', CURRENT_TIMESTAMP),
    ('CJ대한통운', 'https://www.cjlogistics.com', 'https://trace.cjlogistics.com/next/tracking.html?wblNo={{번호}}', CURRENT_TIMESTAMP),
    ('우체국택배', 'https://service.epost.go.kr', 'https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1={{번호}}', CURRENT_TIMESTAMP),
    ('롯데택배', 'https://www.lotteglogis.com', 'https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo={{번호}}', CURRENT_TIMESTAMP),
    ('로젠택배', 'https://www.ilogen.com', 'https://www.ilogen.com/web/personal/trace/{{번호}}', CURRENT_TIMESTAMP);

INSERT INTO "PlatformSetting" ("id", "updatedAt") VALUES (1, CURRENT_TIMESTAMP);

-- RedefineTable: Shop에 셀러 소유 상점 정보 칸을 추가 (기존 행의 slug·상태 등은 그대로 보존)
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Shop" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "ownerUserId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "suspendReason" TEXT,
    "suspendedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "logoUrl" TEXT,
    "ownerName" TEXT,
    "contactPhone" TEXT,
    "kakaoChannelUrl" TEXT,
    "chatUrl" TEXT,
    "bankAccount" TEXT,
    "bankAccountChangedAt" DATETIME,
    "noticeText" TEXT,
    "saleClosesAt" DATETIME,
    "lowStockAt" INTEGER NOT NULL DEFAULT 3,
    "shippingFee" INTEGER NOT NULL DEFAULT 3000,
    "courierCost" INTEGER NOT NULL DEFAULT 0,
    "freeShippingOver" INTEGER NOT NULL DEFAULT 0,
    "senderZipcode" TEXT,
    "senderAddress" TEXT,
    "senderAddressDetail" TEXT,
    "courierId" INTEGER,
    "courierLoginId" TEXT,
    "courierCustomerCode" TEXT,
    "paymentDueRule" TEXT NOT NULL DEFAULT 'HOURS',
    "paymentDueHours" INTEGER NOT NULL DEFAULT 24,
    "paymentDueFixedTime" TEXT,
    CONSTRAINT "Shop_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Shop_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "Courier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Shop" ("createdAt", "id", "name", "ownerUserId", "slug", "status", "suspendReason", "suspendedAt", "updatedAt")
SELECT "createdAt", "id", "name", "ownerUserId", "slug", "status", "suspendReason", "suspendedAt", "updatedAt" FROM "Shop";
DROP TABLE "Shop";
ALTER TABLE "new_Shop" RENAME TO "Shop";
CREATE UNIQUE INDEX "Shop_slug_key" ON "Shop"("slug");
CREATE UNIQUE INDEX "Shop_ownerUserId_key" ON "Shop"("ownerUserId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Setting은 항상 id=1 한 줄이었으므로 그 값을 (있다면 하나뿐인) Shop으로 그대로 복사
UPDATE "Shop" SET
    "logoUrl" = (SELECT "logoUrl" FROM "Setting" WHERE "id" = 1),
    "ownerName" = (SELECT "ownerName" FROM "Setting" WHERE "id" = 1),
    "contactPhone" = (SELECT "contactPhone" FROM "Setting" WHERE "id" = 1),
    "kakaoChannelUrl" = (SELECT "kakaoChannelUrl" FROM "Setting" WHERE "id" = 1),
    "chatUrl" = (SELECT "chatUrl" FROM "Setting" WHERE "id" = 1),
    "bankAccount" = (SELECT "bankAccount" FROM "Setting" WHERE "id" = 1),
    "noticeText" = (SELECT "noticeText" FROM "Setting" WHERE "id" = 1),
    "saleClosesAt" = (SELECT "saleClosesAt" FROM "Setting" WHERE "id" = 1),
    "lowStockAt" = COALESCE((SELECT "lowStockAt" FROM "Setting" WHERE "id" = 1), "lowStockAt"),
    "shippingFee" = COALESCE((SELECT "shippingFee" FROM "Setting" WHERE "id" = 1), "shippingFee"),
    "courierCost" = COALESCE((SELECT "courierCost" FROM "Setting" WHERE "id" = 1), "courierCost"),
    "freeShippingOver" = COALESCE((SELECT "freeShippingOver" FROM "Setting" WHERE "id" = 1), "freeShippingOver"),
    "senderZipcode" = (SELECT "senderZipcode" FROM "Setting" WHERE "id" = 1),
    "senderAddress" = (SELECT "senderAddress" FROM "Setting" WHERE "id" = 1),
    "senderAddressDetail" = (SELECT "senderAddressDetail" FROM "Setting" WHERE "id" = 1),
    "courierLoginId" = (SELECT "courierLoginId" FROM "Setting" WHERE "id" = 1),
    "courierCustomerCode" = (SELECT "courierCustomerCode" FROM "Setting" WHERE "id" = 1)
WHERE EXISTS (SELECT 1 FROM "Setting" WHERE "id" = 1);

-- 예전에 자유 입력이던 택배사 이름을 새 Courier 목록에서 찾아 연결.
-- 이름이 목록에 없으면(직접 입력했던 경우) 그냥 비워둠 — 셀러가 설정 화면에서 다시 골라야 함
UPDATE "Shop" SET "courierId" = (
    SELECT "Courier"."id" FROM "Courier"
    WHERE "Courier"."name" = (SELECT "courierName" FROM "Setting" WHERE "id" = 1)
)
WHERE EXISTS (SELECT 1 FROM "Setting" WHERE "id" = 1 AND "courierName" IS NOT NULL);

-- AlterTable: CourierTemplate에 상점 칸 추가하고, 있는 상점(1개뿐)으로 채움
ALTER TABLE "CourierTemplate" ADD COLUMN "shopId" INTEGER;
UPDATE "CourierTemplate" SET "shopId" = (SELECT "id" FROM "Shop" ORDER BY "id" ASC LIMIT 1);

-- 다 옮겼으니 이제 지운다
PRAGMA foreign_keys=off;
DROP TABLE "Setting";
PRAGMA foreign_keys=on;
