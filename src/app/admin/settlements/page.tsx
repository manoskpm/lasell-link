import { requireOwnShop } from "@/lib/access";
import Link from "next/link";
import { ShipRow } from "@/components/ShipRow";
import { StatusChip } from "@/components/StatusChip";
import { itemLine } from "@/lib/courier";
import { kstRangeToUtc } from "@/lib/date";
import { isNotifySilent } from "@/lib/depositMatchCore";
import { formatDate, won } from "@/lib/format";
import { computePaymentDueAt, isPaymentOverdue } from "@/lib/paymentDue";
import { prisma } from "@/lib/prisma";

const FILTERS = [
  { key: "all", label: "전체" },
  { key: "unpaid", label: "미입금" },
  { key: "overdue", label: "기한초과" },
  { key: "toship", label: "발송대기" },
  { key: "done", label: "발송완료" },
  { key: "canceled", label: "취소" },
];

function statusWhere(filter: string) {
  if (filter === "canceled") return { canceledAt: { not: null } };
  const notCanceled = { canceledAt: null };
  // '기한초과'는 입금 기한이 상점마다 다른 규칙(시간 단위)으로 정해져서
  // DB 조건만으로는 못 거르고, 일단 미입금 건을 가져와 화면단에서 한 번 더 거른다
  if (filter === "unpaid" || filter === "overdue") {
    return { ...notCanceled, paymentStatus: "미입금" };
  }
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
  const { shop } = await requireOwnShop();

  // 입금 알림 자동 확인을 켰는데, 방송 중인데도 알림이 한참 안 들어오면 연결이 끊겼을 수 있음
  const NOTIFY_SILENCE_HOURS = 2;
  const isLiveNow = shop.notifySecretHash
    ? (await prisma.product.count({ where: { isOpen: true } })) > 0
    : false;
  const notifySilent = isNotifySilent(shop, isLiveNow, NOTIFY_SILENCE_HOURS);

  const { filter = "all", from, to, q } = await searchParams;
  const createdAt = kstRangeToUtc(from, to);
  const keyword = q?.trim();

  const fetched = await prisma.settlement.findMany({
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
  });

  // '기한초과'는 상점의 입금 기한 규칙으로 계산해서 지난 것만 남김
  const settlements =
    filter === "overdue"
      ? fetched.filter((s) => isPaymentOverdue(computePaymentDueAt(shop, s.createdAt)))
      : fetched;

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
    return (
      sum +
      itemsTotal +
      settlement.shippingFee -
      settlement.shippingCredit -
      settlement.discount
    );
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
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/settlements/match" className="chip bg-emerald-600 text-white">
            거래내역으로 입금 확인
          </Link>
          <a
            href={`/api/admin/export/settlements?${new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}), ...(filter !== "all" ? { filter } : {}) }).toString()}`}
            className="chip bg-zinc-900 text-white"
          >
            엑셀 내려받기
          </a>
        </div>
      </div>

      {notifySilent && (
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          방송 중인데 입금 알림이 {NOTIFY_SILENCE_HOURS}시간 넘게 안 들어왔어요. 폰이 꺼졌거나
          연결이 끊겼을 수 있어요.{" "}
          <Link href="/admin/settings" className="underline">
            입금 알림 연결 확인하기
          </Link>
        </div>
      )}

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
            const dueAt = computePaymentDueAt(shop, settlement.createdAt);
            const overdue =
              !settlement.canceledAt &&
              settlement.paymentStatus === "미입금" &&
              isPaymentOverdue(dueAt);
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
                    {!settlement.canceledAt &&
                      settlement.paymentStatus === "미입금" && (
                        <p
                          className={`text-xs font-medium ${overdue ? "text-red-600" : "text-zinc-400"}`}
                        >
                          입금 기한 {formatDate(dueAt)}까지
                          {overdue && " — 기한 지남"}
                        </p>
                      )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {settlement.canceledAt && <StatusChip status="취소됨" />}
                    {overdue && <StatusChip status="기한초과" />}
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
                    {won(
                      itemsTotal +
                        settlement.shippingFee -
                        settlement.shippingCredit -
                        settlement.discount
                    )}
                    <span className="ml-1 text-xs font-normal text-zinc-400">
                      (상품 {won(itemsTotal)}
                      {settlement.shippingFee > 0 &&
                        ` + 배송 ${won(settlement.shippingFee)}`}
                      {settlement.shippingCredit > 0 &&
                        ` - 배송비차감 ${won(settlement.shippingCredit)}`}
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
                      trackingUrlTemplate={shop.courier?.trackingUrlTemplate ?? null}
                      courierName={shop.courier?.name ?? null}
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
