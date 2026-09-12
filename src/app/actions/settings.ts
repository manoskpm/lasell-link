"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
  await requireAdmin();

  const shopName = String(formData.get("shopName") ?? "").trim();
  if (!shopName) return { error: "상호(브랜드명)를 입력해주세요." };

  const kakaoChannelUrl = nullable(formData.get("kakaoChannelUrl"));
  const chatUrl = nullable(formData.get("chatUrl"));

  for (const url of [kakaoChannelUrl, chatUrl]) {
    if (url && !/^https?:\/\//.test(url)) {
      return { error: "문의 링크는 http:// 또는 https:// 로 시작해야 해요." };
    }
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

  const data = {
    shopName,
    ownerName: nullable(formData.get("ownerName")),
    contactPhone: nullable(formData.get("contactPhone")),
    kakaoChannelUrl,
    chatUrl,
    bankAccount: nullable(formData.get("bankAccount")),
    noticeText: nullable(formData.get("noticeText")),
    senderZipcode: nullable(formData.get("senderZipcode")),
    senderAddress: nullable(formData.get("senderAddress")),
    senderAddressDetail: nullable(formData.get("senderAddressDetail")),
    courierName: nullable(formData.get("courierName")),
    courierSiteUrl: nullable(formData.get("courierSiteUrl")),
    courierLoginId: nullable(formData.get("courierLoginId")),
    courierCustomerCode: nullable(formData.get("courierCustomerCode")),
    trackingUrlTemplate: nullable(formData.get("trackingUrlTemplate")),
  };

  await prisma.setting.upsert({
    where: { id: 1 },
    create: { id: 1, ...data, logoUrl: logoUrl ?? null },
    update: { ...data, logoUrl },
  });

  revalidatePath("/", "layout");
  return { error: undefined };
}
