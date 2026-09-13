import Link from "next/link";
import { ShipRow } from "@/components/ShipRow";
import { StatusChip } from "@/components/StatusChip";
import { itemLine } from "@/lib/courier";
import { kstRangeToUtc, todayKst } from "@/lib/date";
import { formatDate, won } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export default async function AdminHomePage() {
  const today = todayKst();
  const todayRange = kstRangeToUtc(today, today);

  const [
    todayOrders,
    heldCount,
    unpaidCount,
    toShip,
    openCount,
    soldOutCount,
    memberCount,
    settings,
  ] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: todayRange, canceledAt: null },
      include: { items: true, settlement: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.count({ where: { canceledAt: null, settlementId: null } }),
    prisma.settlement.count({
      where: { paymentStatus: "미입금", canceledAt: null },
    }),
    prisma.settlement.findMany({
      where: {
        paymentStatus: "입금완료",
        shippingStatus: { not: "발송완료" },
        canceledAt: null,
      },
      include: { orders: { include: { items: true } } },
      orderBy: { createdAt: "asc" },
      take: 20,
    }),
    prisma.product.count({ where: { isActive: true, isOpen: true } }),
    prisma.productVariant.count({ where: { stock: 0 } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    getSettings(),
  ]);

  const todaySales = todayOrders.reduce(
    (sum, order) =>
      sum + order.items.reduce((s, item) => s + item.price * item.quantity, 0),
    0
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold lg:text-2xl">오늘 현황</h1>
          <p className="mt-1 text-sm text-zinc-500">{today} (한국시간 기준)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/live" className="chip bg-rose-500 text-white">
            🔴 라이브 오픈 콘솔
          </Link>
          <Link
            href="/admin/products/quick"
            className="chip bg-zinc-900 text-white"
          >
            ⚡ 방송중 빠른등록
          </Link>
          <Link href="/admin/shipping" className="chip bg-zinc-100 text-zinc-700">
            택배 접수하기
          </Link>
        </div>
      </div>

      {!settings.trackingUrlTemplate && (
        <Link
          href="/admin/settings"
          className="rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-700"
        >
          택배사를 설정하면 손님 화면에 배송조회 버튼이 생겨요 →
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="오늘 주문" value={`${todayOrders.length}건`} />
        <Stat label="오늘 매출" value={won(todaySales)} />
        <Stat label="오픈중 상품" value={`${openCount}개`} />
        <Stat label="배송대기 주문" value={`${heldCount}건`} />
        <Stat label="미입금 정산" value={`${unpaidCount}건`} highlight={unpaidCount > 0} />
        <Stat label="발송대기" value={`${toShip.length}건`} highlight={toShip.length > 0} />
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">금일 주문자 목록</h2>
          <Link
            href={`/admin/orders?from=${today}&to=${today}`}
            className="text-xs text-zinc-500 underline"
          >
            주문 화면에서 보기
          </Link>
        </div>

        {todayOrders.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-200 bg-white py-12 text-center text-sm text-zinc-500">
            아직 오늘 주문이 없어요.
          </p>
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-2xl border border-zinc-200 bg-white lg:block">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">시간</th>
                    <th className="px-4 py-3">구매자</th>
                    <th className="px-4 py-3">품목</th>
                    <th className="px-4 py-3 text-right">금액</th>
                    <th className="px-4 py-3">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {todayOrders.map((order) => (
                    <tr key={order.id} className="border-b border-zinc-100 align-top">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-500">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-medium underline"
                        >
                          {order.buyerName}
                        </Link>
                        <p className="text-xs text-zinc-500">{order.buyerPhone}</p>
                      </td>
                      <td className="px-4 py-3">
                        {order.items.map((item) => (
                          <p key={item.id} className="whitespace-nowrap text-xs">
                            {itemLine(item)}
                          </p>
                        ))}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                        {won(
                          order.items.reduce(
                            (sum, item) => sum + item.price * item.quantity,
                            0
                          )
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          {order.settlement ? (
                            <>
                              <Link
                                href={`/admin/settlements/${order.settlement.id}`}
                                className="chip bg-blue-50 text-blue-700"
                              >
                                정산 #{order.settlement.id}
                              </Link>
                              <StatusChip status={order.settlement.paymentStatus} />
                            </>
                          ) : (
                            <StatusChip status="배송대기" />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 lg:hidden">
              {todayOrders.map((order) => (
                <div key={order.id} className="card flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-sm font-semibold underline"
                    >
                      #{order.id} {order.buyerName}
                    </Link>
                    {order.settlement ? (
                      <StatusChip status={order.settlement.paymentStatus} />
                    ) : (
                      <StatusChip status="배송대기" />
                    )}
                  </div>
                  <div className="border-t border-zinc-100 pt-1.5">
                    {order.items.map((item) => (
                      <p key={item.id} className="text-xs font-medium text-zinc-700">
                        {itemLine(item)}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            발송대기 정산 ({toShip.length}건)
          </h2>
          <Link href="/admin/settlements" className="text-xs text-zinc-500 underline">
            정산 전체 보기
          </Link>
        </div>

        {toShip.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-200 bg-white py-10 text-center text-sm text-zinc-500">
            발송할 정산 건이 없어요.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {toShip.map((settlement) => (
              <div key={settlement.id} className="card flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/admin/settlements/${settlement.id}`}
                    className="text-sm font-semibold underline"
                  >
                    정산 #{settlement.id} {settlement.buyerName}
                  </Link>
                  <StatusChip status={settlement.shippingStatus} />
                </div>
                <p className="text-xs text-zinc-500">
                  {settlement.zipcode ? `[${settlement.zipcode}] ` : ""}
                  {settlement.address} {settlement.addressDetail ?? ""}
                </p>
                <div className="border-t border-zinc-100 pt-1.5">
                  {settlement.orders.flatMap((order) =>
                    order.items.map((item) => (
                      <p key={item.id} className="text-xs font-medium text-zinc-700">
                        {itemLine(item)}
                      </p>
                    ))
                  )}
                </div>
                <ShipRow
                  settlementId={settlement.id}
                  trackingNumber={settlement.trackingNumber}
                  shippingStatus={settlement.shippingStatus}
                  trackingUrlTemplate={settings.trackingUrlTemplate}
                  courierName={settings.courierName}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {soldOutCount > 0 && (
        <p className="text-sm text-zinc-500">
          품절된 옵션이 {soldOutCount}개 있어요.{" "}
          <Link href="/admin/products" className="underline">
            재고 채우기
          </Link>
        </p>
      )}

      <p className="text-xs text-zinc-400">회원 {memberCount}명</p>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="text-xs text-zinc-400">{label}</p>
      <p
        className={`mt-1 text-lg font-bold lg:text-xl ${
          highlight ? "text-red-500" : "text-zinc-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
