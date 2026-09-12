"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  detectMapping,
  FIELD_DEFS,
  readSheetInfo,
  readSheetRows,
  type ColumnMapping,
} from "@/lib/courier";
import { prisma } from "@/lib/prisma";
import { readPrivateFile, savePrivateFile } from "@/lib/upload";
import type { FormState } from "./auth";

export async function createTemplateAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const file = formData.get("file") as File | null;

  if (!name) return { error: "양식 이름을 입력해주세요. (예: 한진택배 대량접수)" };
  if (!file || file.size === 0) return { error: "엑셀 양식 파일을 선택해주세요." };
  if (!/\.(xlsx|xlsm)$/i.test(file.name)) {
    return {
      error:
        "xlsx 파일만 등록할 수 있어요. 택배사 양식이 xls(구버전)이면 엑셀에서 '다른 이름으로 저장 → xlsx'로 바꿔주세요.",
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let info;
  try {
    info = await readSheetInfo(buffer);
  } catch {
    return { error: "엑셀 파일을 읽지 못했어요. 파일이 손상되지 않았는지 확인해주세요." };
  }

  const mapping = detectMapping(info.headers);
  const filePath = await savePrivateFile(file);

  const template = await prisma.courierTemplate.create({
    data: {
      name,
      filePath,
      sheetName: info.sheetName,
      headerRow: info.headerRow,
      startRow: info.headerRow + 1,
      mapping: JSON.stringify(mapping),
      isDefault: (await prisma.courierTemplate.count()) === 0,
    },
  });

  revalidatePath("/admin/shipping");
  redirect(`/admin/shipping/templates/${template.id}`);
}

export async function saveTemplateAction(formData: FormData) {
  await requireAdmin();

  const id = Number(formData.get("templateId"));
  const name = String(formData.get("name") ?? "").trim();
  const startRow = Math.max(1, Number(formData.get("startRow")) || 2);

  const mapping: ColumnMapping = {};
  for (const def of FIELD_DEFS) {
    const raw = String(formData.get(`field_${def.key}`) ?? "");
    const column = Number(raw);
    if (column > 0) mapping[def.key] = column;
  }

  await prisma.courierTemplate.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      startRow,
      mapping: JSON.stringify(mapping),
    },
  });

  revalidatePath("/admin/shipping");
  redirect("/admin/shipping");
}

export async function setDefaultTemplateAction(templateId: number) {
  await requireAdmin();
  await prisma.courierTemplate.updateMany({ data: { isDefault: false } });
  await prisma.courierTemplate.update({
    where: { id: templateId },
    data: { isDefault: true },
  });
  revalidatePath("/admin/shipping");
}

export async function deleteTemplateAction(templateId: number) {
  await requireAdmin();
  await prisma.courierTemplate.delete({ where: { id: templateId } });
  revalidatePath("/admin/shipping");
  redirect("/admin/shipping");
}

export type ImportState = {
  error?: string;
  updated?: number;
  failed?: string[];
} | null;

export async function importTrackingAction(
  _prev: ImportState,
  formData: FormData
): Promise<ImportState> {
  await requireAdmin();

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { error: "택배사에서 받은 엑셀 파일을 선택해주세요." };
  }

  let sheet;
  try {
    sheet = await readSheetRows(Buffer.from(await file.arrayBuffer()));
  } catch {
    return { error: "엑셀 파일을 읽지 못했어요." };
  }

  const mapping = detectMapping(sheet.headers);
  if (!mapping.orderNo || !mapping.trackingNumber) {
    const found = sheet.headers.filter(Boolean).join(", ");
    return {
      error: `주문번호 열과 운송장번호 열을 찾지 못했어요. 엑셀에서 읽은 항목: ${found || "(없음)"}`,
    };
  }

  let updated = 0;
  const failed: string[] = [];

  for (const row of sheet.rows) {
    const orderNoText = row[mapping.orderNo - 1] ?? "";
    const tracking = (row[mapping.trackingNumber - 1] ?? "").replace(/\s/g, "");
    const orderId = Number(orderNoText.replace(/[^0-9]/g, ""));

    if (!orderId || !tracking) continue;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      failed.push(`주문 #${orderNoText}: 해당 주문이 없어요`);
      continue;
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { trackingNumber: tracking, shippingStatus: "발송완료" },
    });
    updated += 1;
  }

  revalidatePath("/admin/shipping");
  revalidatePath("/admin/orders");
  revalidatePath("/my/orders");

  if (updated === 0 && failed.length === 0) {
    return { error: "엑셀에서 입력할 운송장번호를 찾지 못했어요." };
  }
  return { updated, failed };
}

/// 양식 파일의 헤더를 다시 읽어 매핑 화면에 표시
export async function loadTemplateHeaders(templateId: number) {
  await requireAdmin();

  const template = await prisma.courierTemplate.findUnique({
    where: { id: templateId },
  });
  if (!template) return null;

  const buffer = await readPrivateFile(template.filePath);
  const info = await readSheetInfo(buffer, template.sheetName);
  return { template, headers: info.headers };
}
