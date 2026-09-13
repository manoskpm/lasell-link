"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EXPENSE_CATEGORIES } from "@/lib/financeCategories";
import type { FormState } from "./auth";

/// 지출 한 건 기록
export async function addExpenseAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const amount = Math.round(Number(formData.get("amount")) || 0);
  const spentAtRaw = String(formData.get("spentAt") ?? "").trim();
  const category = String(formData.get("category") ?? "기타");
  const memo = String(formData.get("memo") ?? "").trim() || null;

  if (amount <= 0) return { error: "금액을 입력해주세요." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(spentAtRaw)) {
    return { error: "날짜를 골라주세요." };
  }
  if (!EXPENSE_CATEGORIES.includes(category)) {
    return { error: "분류를 다시 골라주세요." };
  }

  await prisma.expense.create({
    data: {
      amount,
      category,
      memo,
      spentAt: new Date(`${spentAtRaw}T12:00:00+09:00`),
    },
  });

  revalidatePath("/admin/finance");
  return { error: undefined };
}

export async function deleteExpenseAction(expenseId: number) {
  await requireAdmin();
  await prisma.expense.delete({ where: { id: expenseId } });
  revalidatePath("/admin/finance");
  return { ok: true };
}

/// 매달 나가는 고정비 등록
export async function addFixedCostAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const amount = Math.round(Number(formData.get("amount")) || 0);
  const category = String(formData.get("category") ?? "임대료");

  if (!name) return { error: "이름을 입력해주세요. (예: 창고 월세)" };
  if (amount <= 0) return { error: "금액을 입력해주세요." };

  await prisma.fixedCost.create({ data: { name, amount, category } });

  revalidatePath("/admin/finance");
  return { error: undefined };
}

/// 고정비를 끄거나 다시 켬. 끄면 그 달부터 반영되지 않음
export async function toggleFixedCostAction(id: number, isActive: boolean) {
  await requireAdmin();
  await prisma.fixedCost.update({
    where: { id },
    data: { isActive, endedAt: isActive ? null : new Date() },
  });
  revalidatePath("/admin/finance");
  return { ok: true };
}

export async function deleteFixedCostAction(id: number) {
  await requireAdmin();
  await prisma.fixedCost.delete({ where: { id } });
  revalidatePath("/admin/finance");
  return { ok: true };
}
