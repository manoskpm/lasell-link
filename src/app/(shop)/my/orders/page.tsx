import Link from "next/link";
import { StatusChip } from "@/components/StatusChip";
import { requireUser } from "@/lib/auth";
import { formatDate, optionLabel, won } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { calcShippingFeeByDay } from "@/lib/shipping";

export default async function MyOrdersPage() {
  const user = await requireUser("/login");

  const [heldOrders, settlements, settings] = await Promise.all([
    prisma.order.findMany({
      where: { userId: user.id, settlementId: null, canceledAt: null },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.settlement.findMany({
      where: { userId: user.id },
      include: { orders: { include: { items: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getSettings(),
  ]);

  const heldTotal = heldOrders.reduce(
    (sum, order) =>
      sum + order.items.reduce((s, i) => s + i.price * i.quantity, 0),
    0
  );

  // 배송비는 '그날 합산액'으로 판정 (라방에서 여러 번 나눠 사는 경우가 많아서)
  const shipping = calcShippingFeeByDay({
    orders: heldOrders,
    shippingFee: settings.shippingFee,
    freeShippingOver: settings.freeShippingOver,
  });
  const needMore =
    settings.freeShippingOver > 0
      ? Math.max(0, settings.freeShippingOver - shipping.bestDayTotal)
      : 0;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl font-bold">보관함</h1>
          <p className="mt-1 text-sm text-zinc-500">
            아직 배송 신청 안 한 주문이에요. 모아서 한 번에 정산하면 배송비가
            한 번만 나가요.
          </p>
        </div>

        {heldOrders.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-200 py-10 text-center text-sm text-zinc-500">
            보관중인 주문이 없어요.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {heldOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/my/orders/${order.id}`}
                  className="card flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">
                      {formatDate(order.createdAt)} · 주문 #{order.id}
                    </span>
                    <StatusChip status="보관중" />
                  </div>
                  {order.items.map((item) => (
                    <p key={item.id} className="text-sm text-zinc-700">
                      {item.productName}
                      <span className="text-zinc-400">
                        {" "}
                        · {optionLabel(item.size, item.color)} · {item.quantity}
                        개
                      </span>
                    </p>
                  ))}
                  <p className="text-sm font-bold">
                    {won(
                      order.items.reduce(
                        (sum, i) => sum + i.price * i.quantity,
                        0
                      )
                    )}
                  </p>
                </Link>
              ))}
            </div>

            <div className="card flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">
                  보관중 {heldOrders.length}건
                </span>
                <span className="text-lg font-bold">{won(heldTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">예상 배송비</span>
                <span>
                  {shipping.fee === 0 ? "무료" : won(shipping.fee)}
                </span>
              </div>
              {needMore > 0 && (
                <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                  하루에 {won(settings.freeShippingOver)} 이상 사시면 무료배송!{" "}
                  <b>{won(needMore)}</b> 더 담으면 돼요.
                </p>
              )}
            </div>

            <Link href="/my/settle" className="btn-primary">
              정산하고 배송받기
            </Link>
          </>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">배송 내역</h2>

        {settlements.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-200 py-10 text-center text-sm text-zinc-500">
            아직 정산한 내역이 없어요.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {settlements.map((settlement) => {
              const itemsTotal = settlement.orders.reduce(
                (sum, order) =>
                  sum +
                  order.items.reduce((s, i) => s + i.price * i.quantity, 0),
                0
              );
              return (
                <Link
                  key={settlement.id}
                  href={`/my/settlements/${settlement.id}`}
                  className="card flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">
                      {formatDate(settlement.createdAt)} · 정산 #{settlement.id}
                    </span>
                    <div className="flex gap-1">
                      {settlement.canceledAt && <StatusChip status="취소됨" />}
                      <StatusChip status={settlement.paymentStatus} />
                      {!settlement.canceledAt && (
                        <StatusChip status={settlement.shippingStatus} />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-zinc-600">
                    주문 {settlement.orders.length}건
                  </p>
                  <p className="text-base font-bold">
                    {won(
                      itemsTotal + settlement.shippingFee - settlement.discount
                    )}
                  </p>
                  {settlement.trackingNumber && (
                    <p className="text-xs text-blue-700">
                      운송장 {settlement.trackingNumber} · 눌러서 배송조회
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
