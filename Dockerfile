# 배포용(Railway 등) 이미지. 로컬 개발은 `npm run dev`를 그대로 쓰면 됨 — 이 파일은 안 씀.
#
# better-sqlite3(네이티브 모듈)가 실행 환경과 똑같은 곳에서 빌드돼야 해서
# 빌드 단계부터 실행 단계까지 같은 베이스 이미지(node:22-bookworm-slim, glibc)를 씀

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
# Prisma가 openssl을 찾지 못하면 경고를 내며 기본값으로 동작함 (slim 이미지엔 기본으로 없음)
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV PORT=3000
# Next standalone 서버(server.js)는 이 주소로만 열림. 안 넣으면 컨테이너 안에서
# 컨테이너 이름으로 자동 설정된 HOSTNAME을 쓰게 돼서, Railway 프록시가 못 붙어 502가 날 수 있음
# (Next.js 공식 standalone Dockerfile 예제도 이 줄을 넣음)
ENV HOSTNAME="0.0.0.0"

# standalone 출력(앱 코드 + 필요한 만큼만 추려진 node_modules)을 씀.
# 그 위에 better-sqlite3 등 네이티브 모듈이 온전히 들어있는 전체 node_modules를 덮어써서
# 혹시 standalone 추적 과정에서 빠진 파일이 있어도 안전하게 함
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma7.config.ts ./prisma7.config.ts
COPY --from=builder /app/package.json ./package.json
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
CMD ["./docker-entrypoint.sh"]
