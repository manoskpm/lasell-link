import { prisma } from "./prisma";

/// 운영자만 바꿀 수 있는 운영 방침. 항상 1행이라 간단히 upsert로 가져온다
export function getPlatformSettings() {
  return prisma.platformSetting.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });
}
