import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  fillTemplate,
  itemLine,
  parseMapping,
  type ExportRow,
} from "@/lib/courier";
import { todayKst } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { readPrivateFile } from "@/lib/upload";
import { contentDisposition } from "@/lib/xlsx";

export async function POST(request: Request) {
  await requireAdmin();

  const formData = await request.formData();
  const templateId = Number(formData.get("templateId"));
  const orderIds = formData
    .getAll("orderIds")
    .map((value) => Number(value))
    .filter((value) => value > 0);

  if (!templateId) {
    return NextResponse.json(
      { error: "택배사 양식을 먼저 등록해주세요." },
      { status: 400 }
    );
  }
  if (orderIds.length === 0) {
    return NextResponse.json(
      { error: "내려받을 주문을 선택해주세요." },
      { status: 400 }
    );
  }

  const [template, settings, orders] = await Promise.all([
    prisma.courierTemplate.findUnique({ where: { id: templateId } }),
    getSettings(),
    prisma.order.findMany({
      where: { id: { in: orderIds } },
      include: { items: true },
      orderBy: { id: "asc" },
    }),
  ]);

  if (!template) {
    return NextResponse.json(
      { error: "양식을 찾을 수 없어요." },
      { status: 404 }
    );
  }

  const rows: ExportRow[] = orders.map((order) => ({
    orderNo: order.id,
    receiverName: order.buyerName,
    receiverPhone: order.buyerPhone,
    zipcode: order.zipcode ?? "",
    address: [order.address, order.addressDetail].filter(Boolean).join(" "),
    productName: order.items.map(itemLine).join("\n"),
    quantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
    memo: order.memo ?? "",
    senderName: settings.ownerName || settings.shopName,
    senderPhone: settings.contactPhone ?? "",
    senderZipcode: settings.senderZipcode ?? "",
    senderAddress: [settings.senderAddress, settings.senderAddressDetail]
      .filter(Boolean)
      .join(" "),
  }));

  const templateBuffer = await readPrivateFile(template.filePath);
  const output = await fillTemplate({
    templateBuffer,
    sheetName: template.sheetName,
    startRow: template.startRow,
    mapping: parseMapping(template.mapping),
    rows,
  });

  // 접수한 주문은 '접수완료'로 표시해 다음 접수 때 중복되지 않게 함
  await prisma.order.updateMany({
    where: { id: { in: orders.map((order) => order.id) }, shippingStatus: "접수전" },
    data: { shippingStatus: "접수완료" },
  });

  return new NextResponse(new Uint8Array(output), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": contentDisposition(
        `${template.name}_${todayKst()}.xlsx`,
        `shipping_${todayKst()}.xlsx`
      ),
    },
  });
}
