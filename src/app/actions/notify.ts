"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireOwnShop } from "@/lib/access";
import { recordAudit } from "@/lib/audit";
import { generateNotifySecret, hashNotifySecret } from "@/lib/notifySecret";
import { prisma } from "@/lib/prisma";

/// 입금 알림 연동키를 (재)발급함. 평문 키는 이 응답에만 담겨 오고 DB에는 해시만 남는다.
/// 이미 키가 있었다면 예전 키는 즉시 못 쓰게 됨 (앱/단축어를 다시 설정해야 함)
export async function issueNotifySecretAction(): Promise<
  { ok: true; secret: string; notifyUrl: string } | { error: string }
> {
  const { shop, user } = await requireOwnShop();

  const secret = generateNotifySecret();
  const hash = hashNotifySecret(secret);

  await prisma.shop.update({
    where: { id: shop.id },
    data: { notifySecretHash: hash, notifySecretIssuedAt: new Date() },
  });

  await recordAudit({
    actorUserId: user.id,
    action: "NOTIFY_SECRET_ISSUED",
    targetType: "Shop",
    targetId: shop.id,
    detail: shop.name,
  });

  const host = (await headers()).get("host") ?? "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const notifyUrl = `${protocol}://${host}/api/notify/deposit/${shop.slug}`;

  revalidatePath("/admin/settings");
  return { ok: true, secret, notifyUrl };
}
