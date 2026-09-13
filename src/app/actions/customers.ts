"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/// 손님을 단골로 등록하거나 해제
export async function toggleFollowAction(userId: number, follow: boolean) {
  await requireAdmin();

  await prisma.user.update({
    where: { id: userId },
    data: { followedAt: follow ? new Date() : null },
  });

  revalidatePath("/admin/customers");
  revalidatePath("/admin/orders/new");
  return { ok: true };
}
