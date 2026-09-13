import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusChip } from "@/components/StatusChip";
import { requireUser } from "@/lib/auth";
import { formatDate, optionLabel, won } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { buildTrackingUrl } from "@/lib/tracking";

export default async function SettlementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser("/login");

  const [settlement, settings] = await Promise.all([
    prisma.settlement.findUnique({
      where: { id: Number(id) },
      include: { orders: { include: { items: true } }, coupon: true },
    }),
    getSettings(),
  ]);

  if (!settlement || settlement.userId !== user.id) notFound();

  const itemsTotal = settlement.orders.reduce(
    (sum, order) =>
      sum + order.items.reduce((s, i) => s + i.price * i.quantity, 0),
    0
  );
  const trackingUrl = buildTrackingUrl(
    settings.trackingUrlTemplate,
    settlement.trackingNumber
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p
          className={`text-sm font-semibold ${
            settlement.canceledAt ? "text-red-500" : "text-emerald-600"
          }`}
        >
          {settlement.canceledAt ? "취소된 정산이에요" : "정산이 접수됐어요"}
        </p>
        <h1 className="mt-1 text-xl font-bold">정산 #{settlement.id}</h1>
        <p className="mt-0.5 text-xs text-zinc-400">
          {formatDate(settlement.createdAt)}
        </p>
      </div>

      <div className="flex gap-1.5">
        {settlement.canceledAt && <StatusChip status="취소됨" />}
        <StatusChip status={settlement.paymentStatus} />
        {!settlement.canceledAt && (
          <StatusChip status={settlement.shippingStatus} />
        )}
      </div>

      <section className="card flex flex-col gap-2">
        <p className="text-sm font-semibold">
          함께 보내는 주문 {settlement.orders.length}건
        </p>
        {settlement.orders.map((order) => (
          <div key={order.id} className="border-t border-zinc-100 pt-2">
            <p className="text-xs text-zinc-400">주문 #{order.id}</p>
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
          <span className="text-zinc-500">상품금액</span>
          <span>{won(itemsTotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">배송비</span>
          <span>
            {settlement.shippingFee === 0 ? "무료" : won(settlement.shippingFee)}
          </span>
        </div>
        {settlement.discount > 0 && (
          <div className="flex justify-between text-sm text-red-500">
            <span>쿠폰 할인{settlement.coupon ? ` (${settlement.coupon.name})` : ""}</span>
            <span>-{won(settlement.discount)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-zinc-100 pt-2 font-bold">
          <span>총 결제금액</span>
          <span>
            {won(
              itemsTotal +
                settlement.shippingFee -
                settlement.shippingCredit -
                settlement.discount
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
          <p className="mt-1 text-zinc-500">
            입금자명: {settlement.depositorName}
          </p>
        )}
      </section>

      {settlement.trackingNumber && (
        <section className="card flex flex-col gap-2 text-sm">
          <p className="font-semibold">배송 정보</p>
          <p className="text-zinc-600">
            {settings.courierName ?? "택배"} · 운송장번호{" "}
            <b className="text-zinc-900">{settlement.trackingNumber}</b>
          </p>
          {trackingUrl && (
            <Link
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              배송조회 하기
            </Link>
          )}
        </section>
      )}

      {settlement.paymentStatus === "미입금" && settings.bankAccount && (
        <p className="rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-700">
          입금계좌: <b>{settings.bankAccount}</b>
          <br />
          입금 확인 후 발송해드려요.
        </p>
      )}

      <Link href="/my/orders" className="btn-secondary">
        주문내역으로
      </Link>
    </div>
  );
}
