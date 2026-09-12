import Link from "next/link";
import { notFound } from "next/navigation";
import { CancelOrderButton } from "@/components/CancelOrderButton";
import { OrderStatusControls } from "@/components/OrderStatusControls";
import { ShipRow } from "@/components/ShipRow";
import { StatusChip } from "@/components/StatusChip";
import { formatDate, optionLabel, won } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [order, settings] = await Promise.all([
    prisma.order.findUnique({
      where: { id: Number(id) },
      include: { items: true, user: true },
    }),
    getSettings(),
  ]);

  if (!order) notFound();

  const sales = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const costs = order.items.reduce(
    (sum, item) => sum + item.cost * item.quantity,
    0
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">주문 #{order.id}</h1>
          {order.canceledAt && <StatusChip status="취소됨" />}
        </div>
        <p className="mt-0.5 text-xs text-zinc-400">
          {formatDate(order.createdAt)} ·{" "}
          {order.user ? `회원 ${order.user.loginId}` : "비회원"}
        </p>
      </div>

      {order.canceledAt && (
        <p className="rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-600">
          {formatDate(order.canceledAt)}에 취소된 주문이에요.
          {order.cancelReason ? ` (사유: ${order.cancelReason})` : ""} 정산과
          택배접수에서 제외됩니다.
        </p>
      )}

      <section className="card flex flex-col gap-2">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-zinc-600">
              {item.productName}
              <span className="text-zinc-400">
                {" "}
                · {optionLabel(item.size, item.color)} · {item.quantity}개
              </span>
            </span>
            <span className="shrink-0 font-medium">
              {won(item.price * item.quantity)}
            </span>
          </div>
        ))}
        <div className="mt-1 flex justify-between border-t border-zinc-100 pt-2 font-bold">
          <span>상품매출</span>
          <span>{won(sales)}</span>
        </div>
        <div className="flex justify-between text-sm text-zinc-500">
          <span>배송비</span>
          <span>
            {order.shippingFee === 0 ? "무료" : won(order.shippingFee)}
          </span>
        </div>
        <div className="flex justify-between text-sm font-medium">
          <span>손님 입금액</span>
          <span>{won(sales + order.shippingFee)}</span>
        </div>
        <div className="flex justify-between text-sm text-zinc-500">
          <span>원가</span>
          <span>{won(costs)}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold text-emerald-600">
          <span>순익</span>
          <span>{won(sales - costs)}</span>
        </div>
      </section>

      <section className="card flex flex-col gap-1 text-sm">
        <p className="font-semibold">배송지</p>
        <p className="text-zinc-600">
          {order.buyerName} · {order.buyerPhone}
        </p>
        <p className="text-zinc-600">
          {order.zipcode ? `[${order.zipcode}] ` : ""}
          {order.address} {order.addressDetail ?? ""}
        </p>
        {order.memo && <p className="text-zinc-500">요청: {order.memo}</p>}
        <p className="mt-1 text-xs text-zinc-400">
          결제수단: {order.paymentMethod}
        </p>
        {order.depositorName && (
          <p className="text-sm">
            입금자명:{" "}
            <b
              className={
                order.depositorName !== order.buyerName
                  ? "text-amber-600"
                  : "text-zinc-800"
              }
            >
              {order.depositorName}
            </b>
            {order.depositorName !== order.buyerName && " (주문자와 다름)"}
          </p>
        )}
      </section>

      {!order.canceledAt && (
        <section className="card flex flex-col gap-3">
          <p className="text-sm font-semibold">포장 완료 후 발송처리</p>
          <ShipRow
            orderId={order.id}
            trackingNumber={order.trackingNumber}
            shippingStatus={order.shippingStatus}
            trackingUrlTemplate={settings.trackingUrlTemplate}
            courierName={settings.courierName}
          />
        </section>
      )}

      <OrderStatusControls
        orderId={order.id}
        paymentStatus={order.paymentStatus}
        shippingStatus={order.shippingStatus}
      />

      <Link href="/admin/orders" className="btn-secondary">
        주문 목록으로
      </Link>

      <CancelOrderButton
        orderId={order.id}
        canceled={Boolean(order.canceledAt)}
        shipped={order.shippingStatus === "발송완료"}
      />
    </div>
  );
}
