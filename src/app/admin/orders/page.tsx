import Link from "next/link";
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

const FILTERS = [
  { key: "all", label: "전체" },
  { key: "held", label: "배송대기" },
  { key: "settled", label: "정산완료" },
  { key: "canceled", label: "취소" },
];

function statusWhere(filter: string) {
  if (filter === "canceled") return { canceledAt: { not: null } };
  if (filter === "held") return { canceledAt: null, settlementId: null };
  if (filter === "settled") {
    return { canceledAt: null, settlementId: { not: null } };
  }
  return { canceledAt: null };
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    filter?: string;
    from?: string;
    to?: string;
    q?: string;
  }>;
}) {
  const { filter = "all", from, to, q } = await searchParams;
  const createdAt = kstRangeToUtc(from, to);
  const keyword = q?.trim();

  const orders = await prisma.order.findMany({
    where: {
      ...statusWhere(filter),
      ...(createdAt.gte || createdAt.lte ? { createdAt } : {}),
      ...(keyword
        ? {
            OR: [
              { buyerName: { contains: keyword } },
              { buyerPhone: { contains: keyword } },
            ],
          }
        : {}),
    },
    include: { items: true, settlement: true },
    orderBy: { createdAt: "desc" },
  });

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
    for (const [key, value] of Object.entries({ filter, from, to, q, ...params })) {
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
        <div>
          <h1 className="text-xl font-bold lg:text-2xl">주문 · 매출</h1>
          <p className="mt-1 text-sm text-zinc-500">
            상품 주문 단위예요. 배송은{" "}
            <Link href="/admin/settlements" className="underline">
              정산 · 배송
            </Link>{" "}
            화면에서 처리해요.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/orders/new" className="chip bg-zinc-100 text-zinc-700">
            + 대리주문
          </Link>
          <a
            href={`/api/admin/export/orders?${exportQuery.toString()}`}
            className="chip bg-zinc-900 text-white"
          >
            엑셀 내려받기
          </a>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
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

      <form method="get" className="flex flex-wrap gap-2">
        <input type="hidden" name="filter" value={filter} />
        {from && <input type="hidden" name="from" value={from} />}
        {to && <input type="hidden" name="to" value={to} />}
        <input
          name="q"
          defaultValue={keyword ?? ""}
          placeholder="구매자명 · 연락처 검색"
          className="input max-w-sm"
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
        >
          검색
        </button>
      </form>

      <form
        method="get"
        className="flex flex-wrap items-end gap-2 rounded-2xl border border-zinc-200 bg-white p-4"
      >
        <input type="hidden" name="filter" value={filter} />
        {keyword && <input type="hidden" name="q" value={keyword} />}
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
        <Stat label="상품매출" value={won(sales)} />
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
        <div className="flex flex-col gap-3">
          {orders.map((order) => {
            const total = order.items.reduce(
              (sum, item) => sum + item.price * item.quantity,
              0
            );
            return (
              <div key={order.id} className="card flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="text-sm font-semibold underline"
                  >
                    #{order.id} {order.buyerName}
                  </Link>
                  <div className="flex flex-wrap gap-1">
                    {order.canceledAt ? (
                      <StatusChip status="취소됨" />
                    ) : order.settlement ? (
                      <>
                        <Link
                          href={`/admin/settlements/${order.settlement.id}`}
                          className="chip bg-blue-50 text-blue-700"
                        >
                          정산 #{order.settlement.id}
                        </Link>
                        <StatusChip status={order.settlement.paymentStatus} />
                        <StatusChip status={order.settlement.shippingStatus} />
                      </>
                    ) : (
                      <StatusChip status="배송대기" />
                    )}
                  </div>
                </div>
                <p className="text-xs text-zinc-500">
                  {order.buyerPhone} · {formatDate(order.createdAt)}
                </p>
                <div className="border-t border-zinc-100 pt-1.5">
                  {order.items.map((item) => (
                    <p
                      key={item.id}
                      className="text-xs font-medium text-zinc-700"
                    >
                      {itemLine(item)}
                    </p>
                  ))}
                </div>
                <p className="text-base font-bold">{won(total)}</p>
              </div>
            );
          })}
        </div>
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
