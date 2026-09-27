-- 옛 DB 이관용: 역할 전환(ADMIN→SELLER)으로 셀러가 됐지만 상점이 없는 계정에 상점을 만들어준다.
-- 상점은 1개까지만 운영하므로 가장 먼저 셀러가 된 계정 1명에게만 만든다. 새 DB에서는 아무 일도 하지 않음.
INSERT INTO "Shop" ("slug", "ownerUserId", "name", "status", "updatedAt")
SELECT 'shop-' || u."id",
       u."id",
       COALESCE((SELECT "shopName" FROM "Setting" WHERE "id" = 1), '내 상점'),
       'ACTIVE',
       CURRENT_TIMESTAMP
FROM "User" u
WHERE u."role" = 'SELLER'
  AND NOT EXISTS (SELECT 1 FROM "Shop")
ORDER BY u."id"
LIMIT 1;
