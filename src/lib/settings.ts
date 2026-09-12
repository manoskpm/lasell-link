import { prisma } from "./prisma";

export async function getSettings() {
  return prisma.setting.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });
}
