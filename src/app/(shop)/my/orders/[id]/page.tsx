import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusChip } from "@/components/StatusChip";
import { requireUser } from "@/lib/auth";
import { formatDate, optionLabel, won } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function MyOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser("/login");

  const order = await prisma.order.findUnique({
    where: { id: Number(id) },
    include: { items: true, settlement: true },
  });

  if (!order || order.userId !== user.id) notFound();

  const total = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p
          className={`text-sm font-semibold ${
            order.canceledAt ? "text-red-500" : "text-emerald-600"
          }`}
        >
          {order.canceledAt
            ? "취소된 주문이에요"
            : order.settlement
              ? "정산 완료된 주문이에요"
              : "방송종료 때 배송으로 넘어가요"}
        </p>
        <h1 className="mt-1 text-xl font-bold">주문 #{order.id}</h1>
        <p className="mt-0.5 text-xs text-zinc-400">
          {formatDate(order.createdAt)}
        </p>
      </div>

      <div className="flex gap-1.5">
        {order.canceledAt ? (
          <StatusChip status="취소됨" />
        ) : order.settlement ? (
          <>
            <StatusChip status={order.settlement.paymentStatus} />
            <StatusChip status={order.settlement.shippingStatus} />
          </>
        ) : (
          <StatusChip status="배송대기" />
        )}
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
        <div className="mt-1 flex justify-between border-t border-zinc-100 pt-2 font-bold">
          <span>상품금액</span>
          <span>{won(total)}</span>
        </div>
      </section>

      {order.memo && (
        <p className="rounded-xl bg-zinc-50 px-3.5 py-3 text-sm text-zinc-600">
          요청: {order.memo}
        </p>
      )}

      {order.settlement ? (
        <Link
          href={`/my/settlements/${order.settlement.id}`}
          className="btn-primary"
        >
          정산 #{order.settlement.id} 배송정보 보기
        </Link>
      ) : (
        !order.canceledAt && (
          <>
            <p className="rounded-xl bg-zinc-50 px-3.5 py-3 text-sm text-zinc-600">
              이 주문은 아직 보관중이에요. 다른 주문과 모아서 정산하면 배송비를
              한 번만 내요.
            </p>
            <Link href="/my/settle" className="btn-primary">
              먼저 배송받기
            </Link>
          </>
        )
      )}

      <Link href="/my/orders" className="btn-secondary">
        주문내역으로
      </Link>
    </div>
  );
}
