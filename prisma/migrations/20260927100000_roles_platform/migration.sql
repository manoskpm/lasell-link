-- 역할 3개로 전환: 운영자는 DB 역할이 아니라 (설치 화면으로 만든 계정 + 환경 비밀값의 아이디)로 판단
ALTER TABLE "User" ADD COLUMN "platformAccount" BOOLEAN NOT NULL DEFAULT false;

-- 옛 관리자(ADMIN)는 셀러로 바꾼다. "첫 가입자 = 관리자" 규칙은 없어짐
UPDATE "User" SET "role" = 'SELLER' WHERE "role" = 'ADMIN';
