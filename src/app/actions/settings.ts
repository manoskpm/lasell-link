"use server";

import { revalidatePath } from "next/cache";
import { requireOwnShop } from "@/lib/access";
import { recordAudit } from "@/lib/audit";
import { verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { maskBankAccount } from "@/lib/shop";
import { saveUploadedImage } from "@/lib/upload";
import type { FormState } from "./auth";

function nullable(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

export async function updateSettingsAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { user, shop } = await requireOwnShop();

  const shopName = String(formData.get("shopName") ?? "").trim();
  if (!shopName) return { error: "상호(브랜드명)를 입력해주세요.", field: "shopName" };

  const kakaoChannelUrl = nullable(formData.get("kakaoChannelUrl"));
  const chatUrl = nullable(formData.get("chatUrl"));

  for (const url of [kakaoChannelUrl, chatUrl]) {
    if (url && !/^https?:\/\//.test(url)) {
      return {
        error: "문의 링크는 http:// 또는 https:// 로 시작해야 해요.",
        field: "kakaoChannelUrl",
      };
    }
  }

  // 품절임박 기준은 운영자가 정한 범위 안에서만 허용
  const platformSettings = await prisma.platformSetting.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });
  const lowStockAtRaw = Number(formData.get("lowStockAt"));
  const lowStockAt = Number.isFinite(lowStockAtRaw)
    ? Math.min(
        platformSettings.lowStockAtMax,
        Math.max(platformSettings.lowStockAtMin, lowStockAtRaw)
      )
    : shop.lowStockAt;

  // 택배사는 운영자가 등록해둔 목록에서만 고를 수 있음 (직접 입력 불가)
  const courierIdRaw = formData.get("courierId");
  const courierId = courierIdRaw ? Number(courierIdRaw) : null;
  if (courierId) {
    const courier = await prisma.courier.findUnique({ where: { id: courierId } });
    if (!courier || !courier.isActive) {
      return {
        error: "고른 택배사를 찾을 수 없어요. 목록에서 다시 골라주세요.",
        field: "courierId",
      };
    }
  }

  // 입금 기한 방식 (계산은 다음 단계에서 붙지만, 값은 여기서 저장해둠)
  const paymentDueRule =
    formData.get("paymentDueRule") === "FIXED_TIME" ? "FIXED_TIME" : "HOURS";
  const paymentDueHoursRaw = Number(formData.get("paymentDueHours"));
  const paymentDueHours =
    Number.isFinite(paymentDueHoursRaw) && paymentDueHoursRaw > 0
      ? Math.round(paymentDueHoursRaw)
      : 24;
  const paymentDueFixedTime = nullable(formData.get("paymentDueFixedTime"));
  if (
    paymentDueRule === "FIXED_TIME" &&
    (!paymentDueFixedTime || !/^\d{2}:\d{2}$/.test(paymentDueFixedTime))
  ) {
    return {
      error: "입금 마감 시각을 골라주세요. 예: 18:00",
      field: "paymentDueFixedTime",
    };
  }

  const uploadedLogo = await saveUploadedImage(
    formData.get("logo") as File | null
  );
  // 새 파일이 없고 '로고 삭제'도 아니면 기존 로고를 그대로 둠 (undefined = 변경 없음)
  const logoUrl = uploadedLogo
    ? uploadedLogo
    : formData.get("removeLogo")
      ? null
      : undefined;

  // 계좌를 바꾸는 경우엔 비밀번호를 한 번 더 확인 (계정이 털렸을 때 계좌를 바꿔치기하는 사고 방지)
  const bankAccount = nullable(formData.get("bankAccount"));
  const bankAccountChanged = bankAccount !== shop.bankAccount;
  if (bankAccountChanged) {
    const password = String(formData.get("currentPassword") ?? "");
    if (!password) {
      return {
        error: "입금계좌를 바꾸려면 비밀번호를 한 번 더 입력해주세요.",
        field: "currentPassword",
      };
    }
    if (!verifyPassword(password, user.password)) {
      return {
        error: "비밀번호가 맞지 않아요. 다시 확인하고 입력해주세요.",
        field: "currentPassword",
      };
    }
  }

  const data = {
    name: shopName,
    ownerName: nullable(formData.get("ownerName")),
    contactPhone: nullable(formData.get("contactPhone")),
    kakaoChannelUrl,
    chatUrl,
    bankAccount,
    noticeText: nullable(formData.get("noticeText")),
    senderZipcode: nullable(formData.get("senderZipcode")),
    senderAddress: nullable(formData.get("senderAddress")),
    senderAddressDetail: nullable(formData.get("senderAddressDetail")),
    courierId,
    courierLoginId: nullable(formData.get("courierLoginId")),
    courierCustomerCode: nullable(formData.get("courierCustomerCode")),
    shippingFee: Math.max(0, Number(formData.get("shippingFee")) || 0),
    courierCost: Math.max(0, Number(formData.get("courierCost")) || 0),
    freeShippingOver: Math.max(
      0,
      Number(formData.get("freeShippingOver")) || 0
    ),
    lowStockAt,
    paymentDueRule,
    paymentDueHours,
    paymentDueFixedTime: paymentDueRule === "FIXED_TIME" ? paymentDueFixedTime : null,
    ...(bankAccountChanged ? { bankAccountChangedAt: new Date() } : {}),
  };

  await prisma.shop.update({
    where: { id: shop.id },
    data: { ...data, logoUrl },
  });

  if (bankAccountChanged) {
    await recordAudit({
      actorUserId: user.id,
      action: "SHOP_BANK_ACCOUNT_CHANGED",
      targetType: "Shop",
      targetId: shop.id,
      // 계좌번호 원문은 기록에 남기지 않고 끝자리만
      detail: bankAccount ? `${shop.name} · ${maskBankAccount(bankAccount)}` : `${shop.name} · 계좌 비움`,
    });
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  return { error: undefined };
}
