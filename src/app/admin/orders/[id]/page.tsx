import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusChip } from "@/components/StatusChip";
import { formatDate, optionLabel, won } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id: Number(id) },
    include: { items: true, user: true, settlement: true },
  });

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
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold">주문 #{order.id}</h1>
          {order.canceledAt ? (
            <StatusChip status="취소됨" />
          ) : order.settlement ? (
            <StatusChip status={order.settlement.shippingStatus} />
          ) : (
            <StatusChip status="보관중" />
          )}
        </div>
        <p className="mt-0.5 text-xs text-zinc-400">
          {formatDate(order.createdAt)} ·{" "}
          {order.user ? `회원 ${order.user.loginId}` : "비회원"}
        </p>
      </div>

      {order.canceledAt && (
        <p className="rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-600">
          {formatDate(order.canceledAt)}에 취소된 주문이에요.
          {order.cancelReason ? ` (사유: ${order.cancelReason})` : ""} 매출과
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
          <span>원가</span>
          <span>{won(costs)}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold text-emerald-600">
          <span>순익</span>
          <span>{won(sales - costs)}</span>
        </div>
      </section>

      <section className="card flex flex-col gap-1 text-sm">
        <p className="font-semibold">주문자</p>
        <p className="text-zinc-600">
          {order.buyerName} · {order.buyerPhone}
        </p>
        {order.memo && <p className="text-zinc-500">요청: {order.memo}</p>}
      </section>

      <section className="card flex flex-col gap-2 text-sm">
        <p className="font-semibold">배송 · 정산</p>
        {order.settlement ? (
          <>
            <p className="text-zinc-600">
              정산 #{order.settlement.id}에 묶여 있어요.
            </p>
            <p className="text-zinc-600">
              {order.settlement.zipcode ? `[${order.settlement.zipcode}] ` : ""}
              {order.settlement.address} {order.settlement.addressDetail ?? ""}
            </p>
            <div className="flex gap-1">
              <StatusChip status={order.settlement.paymentStatus} />
              <StatusChip status={order.settlement.shippingStatus} />
            </div>
            <Link
              href={`/admin/settlements/${order.settlement.id}`}
              className="btn-secondary mt-1"
            >
              정산 화면에서 발송처리
            </Link>
          </>
        ) : (
          <p className="text-zinc-500">
            아직 손님 보관함에 있어요. 손님이 정산(합배송)을 눌러 배송지를
            넣으면 여기에 정산번호가 생기고, 그때 배송이 나갑니다.
          </p>
        )}
      </section>

      <Link href="/admin/orders" className="btn-secondary">
        주문 목록으로
      </Link>
    </div>
  );
}
