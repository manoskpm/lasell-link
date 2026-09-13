import Link from "next/link";
import { notFound } from "next/navigation";
import { CancelOrderButton } from "@/components/CancelOrderButton";
import { OrderStatusControls } from "@/components/OrderStatusControls";
import { ShipRow } from "@/components/ShipRow";
import { StatusChip } from "@/components/StatusChip";
import { formatDate, optionLabel, won } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export default async function AdminSettlementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [settlement, settings] = await Promise.all([
    prisma.settlement.findUnique({
      where: { id: Number(id) },
      include: {
        orders: { include: { items: true } },
        user: true,
        coupon: true,
      },
    }),
    getSettings(),
  ]);

  if (!settlement) notFound();

  const itemsTotal = settlement.orders.reduce(
    (sum, order) =>
      sum + order.items.reduce((s, i) => s + i.price * i.quantity, 0),
    0
  );
  const costs = settlement.orders.reduce(
    (sum, order) =>
      sum + order.items.reduce((s, i) => s + i.cost * i.quantity, 0),
    0
  );

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">정산 #{settlement.id}</h1>
          {settlement.canceledAt && <StatusChip status="취소됨" />}
        </div>
        <p className="mt-0.5 text-xs text-zinc-400">
          {formatDate(settlement.createdAt)} ·{" "}
          {settlement.user ? `회원 ${settlement.user.loginId}` : "비회원"}
        </p>
      </div>

      <section className="card flex flex-col gap-2">
        <p className="text-sm font-semibold">
          묶인 주문 {settlement.orders.length}건
        </p>
        {settlement.orders.map((order) => (
          <div key={order.id} className="border-t border-zinc-100 pt-2">
            <div className="flex items-center justify-between">
              <Link
                href={`/admin/orders/${order.id}`}
                className="text-xs text-zinc-400 underline"
              >
                주문 #{order.id}
              </Link>
              {order.canceledAt && <StatusChip status="취소됨" />}
            </div>
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
          </div>
        ))}

        <div className="mt-1 flex justify-between border-t border-zinc-100 pt-2 text-sm">
          <span className="text-zinc-500">상품매출</span>
          <span>{won(itemsTotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-zinc-500">
          <span>배송비</span>
          <span>
            {settlement.shippingFee === 0 ? "무료" : won(settlement.shippingFee)}
          </span>
        </div>
        {settlement.shippingCredit > 0 && (
          <div className="flex justify-between text-sm text-emerald-600">
            <span>배송비 차감 (무료배송 도달)</span>
            <span>-{won(settlement.shippingCredit)}</span>
          </div>
        )}
        {settlement.discount > 0 && (
          <div className="flex justify-between text-sm text-red-500">
            <span>
              쿠폰 할인
              {settlement.coupon ? ` (${settlement.coupon.name})` : ""}
            </span>
            <span>-{won(settlement.discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-medium">
          <span>손님 입금액</span>
          <span>
            {won(
              itemsTotal +
                settlement.shippingFee -
                settlement.shippingCredit -
                settlement.discount
            )}
          </span>
        </div>
        <div className="flex justify-between text-sm text-zinc-500">
          <span>원가</span>
          <span>{won(costs)}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold text-emerald-600">
          <span>순익</span>
          <span>
            {won(
              itemsTotal - costs - settlement.discount - settlement.shippingCredit
            )}
          </span>
        </div>
      </section>

      <section className="card flex flex-col gap-1 text-sm">
        <p className="font-semibold">배송지</p>
        <p className="text-zinc-600">
          {settlement.buyerName} · {settlement.buyerPhone}
        </p>
        <p className="text-zinc-600">
          {settlement.zipcode ? `[${settlement.zipcode}] ` : ""}
          {settlement.address} {settlement.addressDetail ?? ""}
        </p>
        {settlement.memo && (
          <p className="text-zinc-500">요청: {settlement.memo}</p>
        )}
        {settlement.depositorName && (
          <p className="text-sm">
            입금자명:{" "}
            <b
              className={
                settlement.depositorName !== settlement.buyerName
                  ? "text-amber-600"
                  : "text-zinc-800"
              }
            >
              {settlement.depositorName}
            </b>
            {settlement.depositorName !== settlement.buyerName &&
              " (주문자와 다름)"}
          </p>
        )}
      </section>

      {!settlement.canceledAt && (
        <section className="card flex flex-col gap-3">
          <p className="text-sm font-semibold">포장 완료 후 발송처리</p>
          <ShipRow
            settlementId={settlement.id}
            trackingNumber={settlement.trackingNumber}
            shippingStatus={settlement.shippingStatus}
            trackingUrlTemplate={settings.trackingUrlTemplate}
            courierName={settings.courierName}
          />
        </section>
      )}

      <OrderStatusControls
        settlementId={settlement.id}
        paymentStatus={settlement.paymentStatus}
        shippingStatus={settlement.shippingStatus}
      />

      <Link href="/admin/settlements" className="btn-secondary">
        정산 목록으로
      </Link>

      <CancelOrderButton
        settlementId={settlement.id}
        canceled={Boolean(settlement.canceledAt)}
      />
    </div>
  );
}
