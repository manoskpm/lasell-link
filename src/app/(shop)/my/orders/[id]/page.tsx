import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusChip } from "@/components/StatusChip";
import { requireUser } from "@/lib/auth";
import { formatDate, optionLabel, won } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { buildTrackingUrl } from "@/lib/tracking";

export default async function MyOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser("/login");

  const [order, settings] = await Promise.all([
    prisma.order.findUnique({
      where: { id: Number(id) },
      include: { items: true },
    }),
    getSettings(),
  ]);

  if (!order || order.userId !== user.id) notFound();

  const total = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const trackingUrl = buildTrackingUrl(
    settings.trackingUrlTemplate,
    order.trackingNumber
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p
          className={`text-sm font-semibold ${
            order.canceledAt ? "text-red-500" : "text-emerald-600"
          }`}
        >
          {order.canceledAt ? "취소된 주문이에요" : "주문이 접수됐어요"}
        </p>
        <h1 className="mt-1 text-xl font-bold">주문 #{order.id}</h1>
        <p className="mt-0.5 text-xs text-zinc-400">
          {formatDate(order.createdAt)}
        </p>
      </div>

      <div className="flex gap-1.5">
        {order.canceledAt && <StatusChip status="취소됨" />}
        <StatusChip status={order.paymentStatus} />
        {!order.canceledAt && <StatusChip status={order.shippingStatus} />}
      </div>

      {order.canceledAt && order.cancelReason && (
        <p className="rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-600">
          취소 사유: {order.cancelReason}
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
        <div className="mt-1 flex justify-between border-t border-zinc-100 pt-2 text-sm">
          <span className="text-zinc-500">상품금액</span>
          <span>{won(total)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">배송비</span>
          <span>
            {order.shippingFee === 0 ? "무료" : won(order.shippingFee)}
          </span>
        </div>
        <div className="flex justify-between border-t border-zinc-100 pt-2 font-bold">
          <span>총 결제금액</span>
          <span>{won(total + order.shippingFee)}</span>
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
        {order.depositorName && (
          <p className="mt-1 text-zinc-500">
            입금자명: {order.depositorName}
          </p>
        )}
      </section>

      {order.trackingNumber && (
        <section className="card flex flex-col gap-2 text-sm">
          <p className="font-semibold">배송 정보</p>
          <p className="text-zinc-600">
            {settings.courierName ?? "택배"} · 운송장번호{" "}
            <b className="text-zinc-900">{order.trackingNumber}</b>
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

      {order.paymentStatus === "미입금" && settings.bankAccount && (
        <p className="rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-700">
          입금계좌: <b>{settings.bankAccount}</b>
          <br />
          입금 확인 후 발송해드려요.
        </p>
      )}

      <Link href="/" className="btn-secondary">
        계속 쇼핑하기
      </Link>
    </div>
  );
}
