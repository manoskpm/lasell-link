#!/bin/sh
set -e

# 배포될 때마다 DB에 새 변경사항(migration)을 자동으로 적용.
# DATABASE_URL은 영구 디스크 위 파일을 가리켜야 함 (예: file:/data/prod.db)
npx prisma migrate deploy

exec node server.js
