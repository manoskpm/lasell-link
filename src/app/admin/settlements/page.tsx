import Link from "next/link";
import { ShipRow } from "@/components/ShipRow";
import { StatusChip } from "@/components/StatusChip";
import { itemLine } from "@/lib/courier";
import { kstRangeToUtc } from "@/lib/date";
import { formatDate, won } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

const FILTERS = [
  { key: "all", label: "전체" },
  { key: "unpaid", label: "미입금" },
  { key: "toship", label: "발송대기" },
  { key: "done", label: "발송완료" },
  { key: "canceled", label: "취소" },
];

function statusWhere(filter: string) {
  if (filter === "canceled") return { canceledAt: { not: null } };
  const notCanceled = { canceledAt: null };
  if (filter === "unpaid") return { ...notCanceled, paymentStatus: "미입금" };
  if (filter === "toship") {
    return {
      ...notCanceled,
      paymentStatus: "입금완료",
      shippingStatus: { not: "발송완료" },
    };
  }
  if (filter === "done") return { ...notCanceled, shippingStatus: "발송완료" };
  return notCanceled;
}

export default async function AdminSettlementsPage({
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

  const [settlements, settings] = await Promise.all([
    prisma.settlement.findMany({
      where: {
        ...statusWhere(filter),
        ...(createdAt.gte || createdAt.lte ? { createdAt } : {}),
        ...(keyword
          ? {
              OR: [
                { buyerName: { contains: keyword } },
                { depositorName: { contains: keyword } },
                { buyerPhone: { contains: keyword } },
                { trackingNumber: { contains: keyword } },
              ],
            }
          : {}),
      },
      include: { orders: { include: { items: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getSettings(),
  ]);

  const query = (params: Record<string, string | undefined>) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries({ filter, from, to, q, ...params })) {
      if (value) search.set(key, value);
    }
    return `/admin/settlements?${search.toString()}`;
  };

  const totalReceivable = settlements.reduce((sum, settlement) => {
    const itemsTotal = settlement.orders.reduce(
      (s, order) =>
        s + order.items.reduce((x, i) => x + i.price * i.quantity, 0),
      0
    );
    return sum + itemsTotal + settlement.shippingFee - settlement.discount;
  }, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold lg:text-2xl">정산 · 배송</h1>
          <p className="mt-1 text-sm text-zinc-500">
            손님이 보관중인 주문을 모아 정산하면 여기에 한 건으로 올라와요.
            배송은 이 단위로 나갑니다.
          </p>
        </div>
        <a
          href={`/api/admin/export/settlements?${new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}), ...(filter !== "all" ? { filter } : {}) }).toString()}`}
          className="chip bg-zinc-900 text-white"
        >
          엑셀 내려받기
        </a>
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
        <input
          name="q"
          defaultValue={keyword ?? ""}
          placeholder="받는분 · 입금자명 · 연락처 · 운송장 검색"
          className="input max-w-sm"
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
        >
          검색
        </button>
      </form>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-400">정산 건수</p>
          <p className="mt-1 text-lg font-bold">{settlements.length}건</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-400">받을 금액 합계</p>
          <p className="mt-1 text-lg font-bold">{won(totalReceivable)}</p>
        </div>
      </div>

      {settlements.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-200 bg-white py-16 text-center text-sm text-zinc-500">
          해당하는 정산이 없어요.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {settlements.map((settlement) => {
            const itemsTotal = settlement.orders.reduce(
              (sum, order) =>
                sum +
                order.items.reduce((s, i) => s + i.price * i.quantity, 0),
              0
            );
            return (
              <div
                key={settlement.id}
                className="rounded-2xl border border-zinc-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/admin/settlements/${settlement.id}`}
                      className="text-sm font-semibold underline"
                    >
                      정산 #{settlement.id} · {settlement.buyerName}
                    </Link>
                    <p className="text-xs text-zinc-500">
                      {settlement.buyerPhone} ·{" "}
                      {formatDate(settlement.createdAt)} · 주문{" "}
                      {settlement.orders.length}건
                    </p>
                    {settlement.depositorName &&
                      settlement.depositorName !== settlement.buyerName && (
                        <p className="text-xs font-medium text-amber-600">
                          입금자명 {settlement.depositorName}
                        </p>
                      )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {settlement.canceledAt && <StatusChip status="취소됨" />}
                    <StatusChip status={settlement.paymentStatus} />
                    {!settlement.canceledAt && (
                      <StatusChip status={settlement.shippingStatus} />
                    )}
                  </div>
                </div>

                <p className="mt-2 text-xs text-zinc-600">
                  {settlement.zipcode ? `[${settlement.zipcode}] ` : ""}
                  {settlement.address} {settlement.addressDetail ?? ""}
                </p>

                <div className="mt-2 border-t border-zinc-100 pt-2">
                  {settlement.orders.flatMap((order) =>
                    order.items.map((item) => (
                      <p
                        key={item.id}
                        className="text-xs font-medium text-zinc-700"
                      >
                        {itemLine(item)}
                      </p>
                    ))
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-base font-bold">
                    {won(itemsTotal + settlement.shippingFee - settlement.discount)}
                    <span className="ml-1 text-xs font-normal text-zinc-400">
                      (상품 {won(itemsTotal)}
                      {settlement.shippingFee > 0 &&
                        ` + 배송 ${won(settlement.shippingFee)}`}
                      {settlement.discount > 0 &&
                        ` - 할인 ${won(settlement.discount)}`}
                      )
                    </span>
                  </p>
                  {!settlement.canceledAt && (
                    <ShipRow
                      settlementId={settlement.id}
                      trackingNumber={settlement.trackingNumber}
                      shippingStatus={settlement.shippingStatus}
                      trackingUrlTemplate={settings.trackingUrlTemplate}
                      courierName={settings.courierName}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
