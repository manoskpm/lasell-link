import Link from "next/link";
import { ShipRow } from "@/components/ShipRow";
import { StatusChip } from "@/components/StatusChip";
import { itemLine } from "@/lib/courier";
import {
  daysAgoKst,
  kstDateKey,
  kstRangeToUtc,
  monthStartKst,
  todayKst,
} from "@/lib/date";
import { formatDate, won } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

const STATUS_FILTERS = [
  { key: "all", label: "전체" },
  { key: "unpaid", label: "미입금" },
  { key: "toship", label: "발송대기" },
  { key: "done", label: "발송완료" },
];

function statusWhere(filter: string) {
  if (filter === "unpaid") return { paymentStatus: "미입금" };
  if (filter === "toship") {
    return { paymentStatus: "입금완료", shippingStatus: { not: "발송완료" } };
  }
  if (filter === "done") return { shippingStatus: "발송완료" };
  return {};
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; from?: string; to?: string }>;
}) {
  const { filter = "all", from, to } = await searchParams;
  const createdAt = kstRangeToUtc(from, to);

  const [orders, settings] = await Promise.all([
    prisma.order.findMany({
      where: {
        ...statusWhere(filter),
        ...(createdAt.gte || createdAt.lte ? { createdAt } : {}),
      },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    }),
    getSettings(),
  ]);

  const sales = orders.reduce(
    (sum, order) =>
      sum + order.items.reduce((s, item) => s + item.price * item.quantity, 0),
    0
  );
  const costs = orders.reduce(
    (sum, order) =>
      sum + order.items.reduce((s, item) => s + item.cost * item.quantity, 0),
    0
  );

  const daily = new Map<string, { count: number; sales: number }>();
  for (const order of orders) {
    const key = kstDateKey(order.createdAt);
    const current = daily.get(key) ?? { count: 0, sales: 0 };
    current.count += 1;
    current.sales += order.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    daily.set(key, current);
  }
  const dailyRows = [...daily.entries()].sort((a, b) =>
    b[0].localeCompare(a[0])
  );

  const query = (params: Record<string, string | undefined>) => {
    const search = new URLSearchParams();
    const merged = { filter, from, to, ...params };
    for (const [key, value] of Object.entries(merged)) {
      if (value) search.set(key, value);
    }
    return `/admin/orders?${search.toString()}`;
  };

  const exportQuery = new URLSearchParams();
  if (from) exportQuery.set("from", from);
  if (to) exportQuery.set("to", to);
  if (filter !== "all") exportQuery.set("filter", filter);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold lg:text-2xl">주문 · 정산</h1>
        <a
          href={`/api/admin/export/orders?${exportQuery.toString()}`}
          className="chip bg-zinc-900 text-white"
        >
          엑셀 내려받기
        </a>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((item) => (
          <Link
            key={item.key}
            href={query({ filter: item.key })}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              filter === item.key
                ? "bg-zinc-900 text-white"
                : "bg-white text-zinc-600 ring-1 ring-zinc-200"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <form
        method="get"
        className="flex flex-wrap items-end gap-2 rounded-2xl border border-zinc-200 bg-white p-4"
      >
        <input type="hidden" name="filter" value={filter} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">시작일</span>
          <input
            type="date"
            name="from"
            defaultValue={from ?? ""}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">종료일</span>
          <input
            type="date"
            name="to"
            defaultValue={to ?? ""}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
        >
          조회
        </button>
        <div className="flex flex-wrap gap-1.5">
          <Link href={query({ from: todayKst(), to: todayKst() })} className="chip bg-zinc-100 text-zinc-600">
            오늘
          </Link>
          <Link href={query({ from: daysAgoKst(6), to: todayKst() })} className="chip bg-zinc-100 text-zinc-600">
            최근 7일
          </Link>
          <Link href={query({ from: monthStartKst(), to: todayKst() })} className="chip bg-zinc-100 text-zinc-600">
            이번 달
          </Link>
          <Link href={query({ from: "", to: "" })} className="chip bg-zinc-100 text-zinc-600">
            전체
          </Link>
        </div>
      </form>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="주문 건수" value={`${orders.length}건`} />
        <Stat label="매출" value={won(sales)} />
        <Stat label="원가" value={won(costs)} />
        <Stat label="예상 순익" value={won(sales - costs)} accent />
      </div>

      {dailyRows.length > 0 && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold">일자별 매출</h2>
          <div className="mt-3 flex flex-col gap-1">
            {dailyRows.map(([date, info]) => (
              <Link
                key={date}
                href={query({ from: date, to: date })}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-zinc-50"
              >
                <span className="text-zinc-600">{date}</span>
                <span className="flex items-center gap-3">
                  <span className="text-zinc-400">{info.count}건</span>
                  <span className="font-semibold">{won(info.sales)}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {orders.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-200 bg-white py-16 text-center text-sm text-zinc-500">
          해당하는 주문이 없어요.
        </p>
      ) : (
        <>
          {/* PC: 표 형태 */}
          <div className="hidden overflow-x-auto rounded-2xl border border-zinc-200 bg-white lg:block">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs text-zinc-500">
                <tr>
                  <th className="px-4 py-3">주문</th>
                  <th className="px-4 py-3">구매자</th>
                  <th className="px-4 py-3">배송지</th>
                  <th className="px-4 py-3">품목</th>
                  <th className="px-4 py-3 text-right">금액</th>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3">발송처리</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const total = order.items.reduce(
                    (sum, item) => sum + item.price * item.quantity,
                    0
                  );
                  return (
                    <tr key={order.id} className="border-b border-zinc-100 align-top">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-semibold underline"
                        >
                          #{order.id}
                        </Link>
                        <p className="text-xs text-zinc-400">
                          {formatDate(order.createdAt)}
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-medium">{order.buyerName}</p>
                        <p className="text-xs text-zinc-500">
                          {order.buyerPhone}
                        </p>
                      </td>
                      <td className="max-w-[220px] px-4 py-3 text-xs text-zinc-600">
                        {order.zipcode ? `[${order.zipcode}] ` : ""}
                        {order.address} {order.addressDetail ?? ""}
                      </td>
                      <td className="px-4 py-3">
                        {order.items.map((item) => (
                          <p key={item.id} className="whitespace-nowrap text-xs">
                            {itemLine(item)}
                          </p>
                        ))}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                        {won(total)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <StatusChip status={order.paymentStatus} />
                          <StatusChip status={order.shippingStatus} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ShipRow
                          orderId={order.id}
                          trackingNumber={order.trackingNumber}
                          shippingStatus={order.shippingStatus}
                          trackingUrlTemplate={settings.trackingUrlTemplate}
                          courierName={settings.courierName}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 모바일: 카드 형태 */}
          <div className="flex flex-col gap-3 lg:hidden">
            {orders.map((order) => {
              const total = order.items.reduce(
                (sum, item) => sum + item.price * item.quantity,
                0
              );
              return (
                <div key={order.id} className="card flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-sm font-semibold underline"
                    >
                      #{order.id} {order.buyerName}
                    </Link>
                    <div className="flex gap-1">
                      <StatusChip status={order.paymentStatus} />
                      <StatusChip status={order.shippingStatus} />
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {order.buyerPhone} · {formatDate(order.createdAt)}
                  </p>
                  <div className="border-t border-zinc-100 pt-1.5">
                    {order.items.map((item) => (
                      <p key={item.id} className="text-xs font-medium text-zinc-700">
                        {itemLine(item)}
                      </p>
                    ))}
                  </div>
                  <p className="text-base font-bold">{won(total)}</p>
                  <ShipRow
                    orderId={order.id}
                    trackingNumber={order.trackingNumber}
                    shippingStatus={order.shippingStatus}
                    trackingUrlTemplate={settings.trackingUrlTemplate}
                    courierName={settings.courierName}
                  />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="text-xs text-zinc-400">{label}</p>
      <p
        className={`mt-1 text-lg font-bold lg:text-xl ${
          accent ? "text-emerald-600" : "text-zinc-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
