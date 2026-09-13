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
    ...(filter === "canceled"
      ? { canceledAt: { not: null } }
      : { canceledAt: null }),
    ...(filter === "unpaid" ? { paymentStatus: "미입금" } : {}),
    ...(filter === "toship"
      ? { paymentStatus: "입금완료", shippingStatus: { not: "발송완료" } }
      : {}),
    ...(filter === "done" ? { shippingStatus: "발송완료" } : {}),
    ...(createdAt.gte || createdAt.lte ? { createdAt } : {}),
  };

  const settlements = await prisma.settlement.findMany({
    where,
    include: {
      orders: { include: { items: true } },
      user: true,
      coupon: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = settlements.map((settlement) => {
    const items = settlement.orders.flatMap((order) => order.items);
    const sales = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const cost = items.reduce((sum, item) => sum + item.cost * item.quantity, 0);
    return {
      id: settlement.id,
      createdAt: formatDate(settlement.createdAt),
      buyerName: settlement.buyerName,
      depositorName: settlement.depositorName ?? "",
      buyerPhone: settlement.buyerPhone,
      zipcode: settlement.zipcode ?? "",
      address: [settlement.address, settlement.addressDetail]
        .filter(Boolean)
        .join(" "),
      orderCount: settlement.orders.length,
      items: items.map(itemLine).join("\n"),
      quantity: items.reduce((sum, item) => sum + item.quantity, 0),
      sales,
      shippingFee: settlement.shippingFee,
      discount: settlement.discount,
      coupon: settlement.coupon?.name ?? "",
      received: sales + settlement.shippingFee - settlement.discount,
      cost,
      profit: sales - cost - settlement.discount,
      paymentMethod: settlement.paymentMethod,
      paymentStatus: settlement.paymentStatus,
      shippingStatus: settlement.canceledAt
        ? "취소됨"
        : settlement.shippingStatus,
      trackingNumber: settlement.trackingNumber ?? "",
      memo: settlement.memo ?? "",
      loginId: settlement.user?.loginId ?? "",
    };
  });

  const buffer = await buildSheet({
    sheetName: "정산내역",
    columns: [
      { header: "정산번호", key: "id", width: 10 },
      { header: "정산일시", key: "createdAt", width: 16 },
      { header: "받는분", key: "buyerName", width: 12 },
      { header: "입금자명", key: "depositorName", width: 12 },
      { header: "연락처", key: "buyerPhone", width: 16 },
      { header: "우편번호", key: "zipcode", width: 10 },
      { header: "배송지", key: "address", width: 40 },
      { header: "묶인주문", key: "orderCount", width: 8 },
      { header: "품목", key: "items", width: 40 },
      { header: "총수량", key: "quantity", width: 8 },
      { header: "상품매출", key: "sales", width: 12 },
      { header: "배송비", key: "shippingFee", width: 10 },
      { header: "할인", key: "discount", width: 10 },
      { header: "쿠폰", key: "coupon", width: 14 },
      { header: "입금액", key: "received", width: 12 },
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
    `정산내역${period}.xlsx`,
    `settlements${period}.xlsx`
  );
}
