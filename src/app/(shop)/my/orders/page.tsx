import Link from "next/link";
import { StatusChip } from "@/components/StatusChip";
import { requireUser } from "@/lib/auth";
import { formatDate, optionLabel, won } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function MyOrdersPage() {
  const user = await requireUser("/login");

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-5 py-20">
        <p className="text-sm text-zinc-500">아직 주문내역이 없어요.</p>
        <Link href="/" className="btn-primary w-40">
          상품 보러가기
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">주문내역</h1>

      <div className="flex flex-col gap-3">
        {orders.map((order) => {
          const total = order.items.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          );
          return (
            <Link
              key={order.id}
              href={`/my/orders/${order.id}`}
              className="card flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">
                  {formatDate(order.createdAt)} · 주문 #{order.id}
                </span>
                <div className="flex gap-1">
                  <StatusChip status={order.paymentStatus} />
                  <StatusChip status={order.shippingStatus} />
                </div>
              </div>
              <p className="text-sm">
                {order.items[0]?.productName}
                <span className="text-zinc-400">
                  {" "}
                  · {optionLabel(order.items[0]?.size, order.items[0]?.color)}
                </span>
                {order.items.length > 1 && (
                  <span className="text-zinc-500">
                    {" "}
                    외 {order.items.length - 1}건
                  </span>
                )}
              </p>
              <p className="text-base font-bold">{won(total)}</p>
              {order.trackingNumber && (
                <p className="text-xs text-blue-700">
                  운송장 {order.trackingNumber} · 눌러서 배송조회
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
