"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { FormState } from "./auth";

const TYPES = ["AMOUNT", "PERCENT", "FREE_SHIPPING"];

export async function createCouponAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "AMOUNT");
  const value = Math.max(0, Number(formData.get("value")) || 0);
  const minAmount = Math.max(0, Number(formData.get("minAmount")) || 0);
  const expiresAtRaw = String(formData.get("expiresAt") ?? "").trim();

  if (!name) return { error: "쿠폰 이름을 입력해주세요." };
  if (!TYPES.includes(type)) return { error: "쿠폰 종류를 다시 선택해주세요." };
  if (type !== "FREE_SHIPPING" && value <= 0) {
    return { error: "할인 값을 입력해주세요." };
  }
  if (type === "PERCENT" && value > 100) {
    return { error: "정률 할인은 100%를 넘을 수 없어요." };
  }

  await prisma.coupon.create({
    data: {
      name,
      type,
      value: type === "FREE_SHIPPING" ? 0 : value,
      minAmount,
      expiresAt: expiresAtRaw ? new Date(`${expiresAtRaw}T23:59:59+09:00`) : null,
    },
  });

  revalidatePath("/admin/coupons");
  revalidatePath("/my/settle");
  return { error: undefined };
}

export async function toggleCouponActiveAction(
  couponId: number,
  isActive: boolean
) {
  await requireAdmin();
  await prisma.coupon.update({ where: { id: couponId }, data: { isActive } });
  revalidatePath("/admin/coupons");
  revalidatePath("/my/settle");
  return { ok: true };
}

/// 이미 사용된 쿠폰은 지우면 정산 기록이 깨지니, 사용 이력이 없을 때만 삭제
export async function deleteCouponAction(couponId: number) {
  await requireAdmin();

  const used = await prisma.settlement.count({ where: { couponId } });
  if (used > 0) {
    return { error: "이미 사용된 쿠폰이라 삭제할 수 없어요. 대신 꺼두세요." };
  }

  await prisma.coupon.delete({ where: { id: couponId } });
  revalidatePath("/admin/coupons");
  return { ok: true };
}
