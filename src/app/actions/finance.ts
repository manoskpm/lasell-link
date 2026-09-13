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

/// 택배사 청구서 한 달치 기록.
/// 청구서는 보통 한 달 늦게 오므로(8월 청구서 = 7월 발송분)
/// "발송한 달"을 기준으로 저장한다
export async function saveCourierBillAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const month = String(formData.get("month") ?? "").trim();
  const amount = Math.round(Number(formData.get("amount")) || 0);
  const memo = String(formData.get("memo") ?? "").trim() || null;

  if (!/^\d{4}-\d{2}$/.test(month)) return { error: "발송한 달을 골라주세요." };
  if (amount <= 0) return { error: "청구된 금액을 입력해주세요." };

  // 청구서를 받은 달 = 발송한 달의 다음 달
  const [y, m] = month.split("-").map(Number);
  const billedMonth = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}`;

  await prisma.courierBill.upsert({
    where: { month },
    create: { month, billedMonth, amount, memo },
    update: { amount, memo },
  });

  revalidatePath("/admin/finance");
  return { error: undefined };
}

export async function deleteCourierBillAction(month: string) {
  await requireAdmin();
  await prisma.courierBill.deleteMany({ where: { month } });
  revalidatePath("/admin/finance");
  return { ok: true };
}

/// 택배 건당 단가(어림값 계산에 쓰는 값)를 장부 화면에서 바로 고치게
export async function updateCourierUnitCostAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const courierCost = Math.max(0, Math.round(Number(formData.get("courierCost")) || 0));
  await prisma.setting.upsert({
    where: { id: 1 },
    create: { id: 1, courierCost },
    update: { courierCost },
  });

  revalidatePath("/admin/finance");
  return { error: undefined };
}
