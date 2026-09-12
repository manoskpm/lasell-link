import { getCurrentUser } from "@/lib/auth";
import { itemLine } from "@/lib/courier";
import { kstRangeToUtc } from "@/lib/date";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { buildSheet, xlsxResponse } from "@/lib/xlsx";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") {
    return new Response("권한이 없어요.", { status: 403 });
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? undefined;
  const filter = url.searchParams.get("filter") ?? "all";
  const createdAt = kstRangeToUtc(from, to);

  const where = {
    ...(filter === "unpaid" ? { paymentStatus: "미입금" } : {}),
    ...(filter === "toship"
      ? { paymentStatus: "입금완료", shippingStatus: { not: "발송완료" } }
      : {}),
    ...(filter === "done" ? { shippingStatus: "발송완료" } : {}),
    ...(createdAt.gte || createdAt.lte ? { createdAt } : {}),
  };

  const orders = await prisma.order.findMany({
    where,
    include: { items: true, user: true },
    orderBy: { createdAt: "desc" },
  });

  const rows = orders.map((order) => {
    const sales = order.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const cost = order.items.reduce(
      (sum, item) => sum + item.cost * item.quantity,
      0
    );
    return {
      id: order.id,
      createdAt: formatDate(order.createdAt),
      buyerName: order.buyerName,
      buyerPhone: order.buyerPhone,
      zipcode: order.zipcode ?? "",
      address: [order.address, order.addressDetail].filter(Boolean).join(" "),
      items: order.items.map(itemLine).join("\n"),
      quantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
      sales,
      cost,
      profit: sales - cost,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      shippingStatus: order.shippingStatus,
      trackingNumber: order.trackingNumber ?? "",
      memo: order.memo ?? "",
      loginId: order.user?.loginId ?? "",
    };
  });

  const buffer = await buildSheet({
    sheetName: "주문내역",
    columns: [
      { header: "주문번호", key: "id", width: 10 },
      { header: "주문일시", key: "createdAt", width: 16 },
      { header: "구매자", key: "buyerName", width: 12 },
      { header: "연락처", key: "buyerPhone", width: 16 },
      { header: "우편번호", key: "zipcode", width: 10 },
      { header: "배송지", key: "address", width: 40 },
      { header: "품목", key: "items", width: 40 },
      { header: "총수량", key: "quantity", width: 8 },
      { header: "매출", key: "sales", width: 12 },
      { header: "원가", key: "cost", width: 12 },
      { header: "순익", key: "profit", width: 12 },
      { header: "결제수단", key: "paymentMethod", width: 10 },
      { header: "입금상태", key: "paymentStatus", width: 10 },
      { header: "배송상태", key: "shippingStatus", width: 10 },
      { header: "운송장번호", key: "trackingNumber", width: 18 },
      { header: "요청사항", key: "memo", width: 24 },
      { header: "회원아이디", key: "loginId", width: 16 },
    ],
    rows,
  });

  const period = from || to ? `_${from ?? ""}~${to ?? ""}` : "";
  return xlsxResponse(
    buffer,
    `주문내역${period}.xlsx`,
    `orders${period}.xlsx`
  );
}
