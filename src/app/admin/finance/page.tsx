import Link from "next/link";
import { Calendar } from "./Calendar";
import { CourierBillForm } from "./CourierBillForm";
import { ExpenseForm } from "./ExpenseForm";
import { FixedCostForm } from "./FixedCostForm";
import { RemoveButton } from "@/components/RemoveButton";
import {
  deleteCourierBillAction,
  deleteExpenseAction,
  deleteFixedCostAction,
  toggleFixedCostAction,
} from "@/app/actions/finance";
import { todayKst } from "@/lib/date";
import {
  dailyBreakdown,
  kstMonthKey,
  kstMonthRange,
  monthlySummary,
  shiftMonth,
} from "@/lib/finance";
import { formatDateOnly, won } from "@/lib/format";
import { prisma } from "@/lib/prisma";

/// 차트 라벨은 원 단위로 적으면 너무 길어서 만원 단위로 줄임
function wonShort(value: number) {
  const abs = Math.abs(value);
  if (abs >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}억`;
  if (abs >= 10_000)
    return `${Math.round(value / 10_000).toLocaleString("ko-KR")}만`;
  return value.toLocaleString("ko-KR");
}

function monthLabel(month: string) {
  return `${Number(month.slice(5, 7))}월`;
}

/// 하루치 구간 (한국 시간 기준)
function kstDayRange(day: string) {
  return {
    gte: new Date(`${day}T00:00:00+09:00`),
    lt: new Date(new Date(`${day}T00:00:00+09:00`).getTime() + 86_400_000),
  };
}

export default async function AdminFinancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; day?: string }>;
}) {
  const { month: monthParam, day: dayParam } = await searchParams;
  const today = todayKst();
  const thisMonth = today.slice(0, 7);
  const month = /^\d{4}-\d{2}$/.test(monthParam ?? "")
    ? (monthParam as string)
    : thisMonth;
  const selectedDay =
    dayParam && dayParam.startsWith(month) && /^\d{4}-\d{2}-\d{2}$/.test(dayParam)
      ? dayParam
      : undefined;

  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5));
  // 청구서는 다음 달 말에 오므로(6월 발송분 → 7월 말 청구) 항상 지난달이 기준
  const lastMonth = shiftMonth(thisMonth, -1);

  const [summary, trend, cells, expenses, fixedCosts, bills] =
    await Promise.all([
      monthlySummary(month),
      Promise.all(months.map((m) => monthlySummary(m))),
      dailyBreakdown(month),
      prisma.expense.findMany({
        where: { spentAt: kstMonthRange(month) },
        orderBy: [{ spentAt: "desc" }, { id: "desc" }],
      }),
      prisma.fixedCost.findMany({
        orderBy: [{ isActive: "desc" }, { id: "asc" }],
      }),
      prisma.courierBill.findMany({ orderBy: { month: "desc" }, take: 12 }),
    ]);

  // 날짜를 고른 경우에만 그날 상세를 뽑는다
  const dayOrders = selectedDay
    ? await prisma.order.findMany({
        where: { canceledAt: null, createdAt: kstDayRange(selectedDay) },
        include: { items: true },
        orderBy: { id: "desc" },
      })
    : [];
  const dayExpenses = selectedDay
    ? await prisma.expense.findMany({
        where: { spentAt: kstDayRange(selectedDay) },
        orderBy: { id: "desc" },
      })
    : [];

  const peak = Math.max(1, ...trend.map((m) => Math.abs(m.profit)));

  // 청구서 안내는 지금 보고 있는 달과 무관하게 "오늘 기준 지난 6개월"로 따진다
  const billMonths = Array.from({ length: 6 }, (_, i) =>
    shiftMonth(lastMonth, i - 5)
  );
  const [shipments, settings] = await Promise.all([
    prisma.settlement.findMany({
      where: {
        canceledAt: null,
        createdAt: {
          gte: kstMonthRange(billMonths[0]).gte,
          lt: kstMonthRange(lastMonth).lt,
        },
      },
      select: { createdAt: true },
    }),
    prisma.setting.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} }),
  ]);

  const shipmentsByMonth = new Map<string, number>();
  for (const s of shipments) {
    const key = kstMonthKey(s.createdAt);
    shipmentsByMonth.set(key, (shipmentsByMonth.get(key) ?? 0) + 1);
  }

  // 발송은 있었는데 청구서를 아직 안 적은 달
  const billed = new Set(bills.map((b) => b.month));
  const waiting = billMonths.filter(
    (m) => (shipmentsByMonth.get(m) ?? 0) > 0 && !billed.has(m)
  );
  // 입력칸 기본값은 가장 오래 밀린 달, 없으면 지난달
  const defaultBillMonth = waiting[0] ?? lastMonth;
  // 어림값(발송 건수 × 건당 단가)과 실제 청구액을 비교해 보여주려고
  const estimates = new Map(
    billMonths.map((m) => [
      m,
      (shipmentsByMonth.get(m) ?? 0) * settings.courierCost,
    ])
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold lg:text-2xl">장부</h1>
          <p className="mt-1 text-sm text-zinc-500">
            매출과 상품 원가는 주문에서 자동으로 잡혀요. 사장님은 그 외에 쓴 돈만
            적으시면 됩니다.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            href={`/admin/finance?month=${shiftMonth(month, -1)}`}
            className="chip bg-zinc-100 text-zinc-600"
          >
            ← 지난달
          </Link>
          <span className="px-2 text-sm font-semibold tabular-nums">
            {month.replace("-", ". ")}
          </span>
          <Link
            href={`/admin/finance?month=${shiftMonth(month, 1)}`}
            className="chip bg-zinc-100 text-zinc-600"
          >
            다음달 →
          </Link>
        </div>
      </div>

      {/* 요약 */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-400">수입</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {won(summary.income)}
          </p>
          <p className="mt-0.5 text-xs text-zinc-400">
            주문 {summary.orderCount}건 · 배송 {summary.shipmentCount}건
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-400">지출</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {won(summary.expense)}
          </p>
          <p className="mt-0.5 text-xs text-zinc-400">원가·택배·고정비 포함</p>
        </div>
        <div
          className={`rounded-2xl border p-4 ${
            summary.profit >= 0
              ? "border-emerald-200 bg-emerald-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          <p
            className={`text-xs ${
              summary.profit >= 0 ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {summary.profit >= 0 ? "남은 돈" : "모자란 돈"}
          </p>
          <p
            className={`mt-1 text-2xl font-bold tabular-nums ${
              summary.profit >= 0 ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {won(summary.profit)}
          </p>
          <p
            className={`mt-0.5 text-xs ${
              summary.profit >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            수입 − 지출
          </p>
        </div>
      </section>

      {/* 달력 + 고른 날 상세 */}
      <section className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="card">
          <h2 className="text-sm font-semibold">
            {month.replace("-", ". ")} 달력
          </h2>
          <p className="mt-0.5 text-xs text-zinc-400">
            날짜를 누르면 그날 판 것과 쓴 것이 오른쪽에 나와요.
          </p>
          <div className="mt-4">
            <Calendar
              month={month}
              cells={cells}
              today={today}
              selected={selectedDay}
            />
          </div>
        </div>

        <div className="card flex flex-col gap-3">
          {selectedDay ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">
                  {formatDateOnly(new Date(`${selectedDay}T12:00:00+09:00`))}
                </p>
                <Link
                  href={`/admin/finance?month=${month}`}
                  className="text-xs text-zinc-400 underline"
                >
                  닫기
                </Link>
              </div>

              <div>
                <p className="text-xs font-medium text-emerald-600">
                  판매 {dayOrders.length}건
                </p>
                {dayOrders.length === 0 ? (
                  <p className="py-2 text-xs text-zinc-400">주문이 없어요.</p>
                ) : (
                  <div className="mt-1 flex flex-col">
                    {dayOrders.map((order) => {
                      const total = order.items.reduce(
                        (sum, item) => sum + item.price * item.quantity,
                        0
                      );
                      return (
                        <div
                          key={order.id}
                          className="flex items-center justify-between gap-2 border-b border-zinc-100 py-1.5 text-sm last:border-b-0"
                        >
                          <span className="min-w-0 flex-1 truncate text-zinc-600">
                            {order.buyerName}
                            <span className="ml-1.5 text-xs text-zinc-400">
                              {order.items[0]?.productName ?? ""}
                            </span>
                          </span>
                          <span className="shrink-0 tabular-nums">
                            {won(total)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-red-500">
                  지출 {dayExpenses.length}건
                </p>
                {dayExpenses.length === 0 ? (
                  <p className="py-2 text-xs text-zinc-400">적어둔 지출이 없어요.</p>
                ) : (
                  <div className="mt-1 flex flex-col">
                    {dayExpenses.map((expense) => (
                      <div
                        key={expense.id}
                        className="flex items-center justify-between gap-2 border-b border-zinc-100 py-1.5 text-sm last:border-b-0"
                      >
                        <span className="min-w-0 flex-1 truncate text-zinc-600">
                          <span className="chip mr-1.5 bg-zinc-100 text-zinc-500">
                            {expense.category}
                          </span>
                          {expense.memo ?? ""}
                        </span>
                        <span className="shrink-0 tabular-nums">
                          {won(expense.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold">최근 6개월 남은 돈</p>
              <p className="text-xs text-zinc-400">
                기준선 아래로 내려가면 적자예요.
              </p>
              <div className="mt-2 flex items-end gap-1.5">
                {trend.map((m) => {
                  const barHeight = Math.max(
                    3,
                    Math.round((Math.abs(m.profit) / peak) * 70)
                  );
                  const isLoss = m.profit < 0;
                  const isCurrent = m.month === month;
                  return (
                    <div
                      key={m.month}
                      className="group relative flex flex-1 flex-col items-center gap-1"
                    >
                      <span
                        className={`text-[10px] font-semibold tabular-nums ${
                          isLoss ? "text-red-600" : "text-emerald-700"
                        }`}
                      >
                        {wonShort(m.profit)}
                      </span>
                      <div className="flex h-[74px] w-full items-end justify-center">
                        {!isLoss && (
                          <div
                            className="w-full max-w-[34px] rounded-t bg-emerald-500"
                            style={{ height: `${barHeight}px` }}
                          />
                        )}
                      </div>
                      <div className="h-px w-full bg-zinc-300" />
                      <div className="flex h-[30px] w-full items-start justify-center">
                        {isLoss && (
                          <div
                            className="w-full max-w-[34px] rounded-b bg-red-500"
                            style={{ height: `${Math.min(30, barHeight)}px` }}
                          />
                        )}
                      </div>
                      <Link
                        href={`/admin/finance?month=${m.month}`}
                        className={`text-[11px] tabular-nums ${
                          isCurrent
                            ? "font-bold text-zinc-900"
                            : "text-zinc-400 hover:text-zinc-600"
                        }`}
                      >
                        {monthLabel(m.month)}
                      </Link>

                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-lg bg-zinc-900 px-2.5 py-1.5 text-[11px] leading-relaxed text-white opacity-0 transition-opacity group-hover:opacity-100">
                        <b>{m.month.replace("-", ". ")}</b>
                        <br />
                        수입 {won(m.income)}
                        <br />
                        지출 {won(m.expense)}
                        <br />
                        남은 돈 {won(m.profit)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>

      {/* 상세 내역 */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card flex flex-col gap-1">
          <p className="text-sm font-semibold">들어온 돈</p>
          <Row label="상품 판매" value={summary.productSales} auto />
          <Row label="받은 배송비" value={summary.shippingIncome} auto />
          <Row label="합계" value={summary.income} strong />
        </div>

        <div className="card flex flex-col gap-1">
          <p className="text-sm font-semibold">나간 돈</p>
          <Row label="상품 원가" value={summary.goodsCost} auto />
          <Row
            label={`택배비 (${summary.shipmentCount}건)`}
            value={summary.courierCost}
            auto={!summary.courierIsActual}
            badge={summary.courierIsActual ? "실제 청구" : undefined}
            note={
              !summary.courierIsActual && summary.shipmentCount > 0
                ? "청구서 오면 바뀌어요"
                : undefined
            }
          />
          <Row label="쿠폰 할인" value={summary.discount} auto />
          <Row label="고정비" value={summary.fixedCost} />
          <Row label="그 외 지출" value={summary.otherExpense} />
          <Row label="합계" value={summary.expense} strong />
        </div>
      </section>

      {/* 택배비 청구서 */}
      <section className="card flex flex-col gap-3">
        <div>
          <p className="text-sm font-semibold">택배비 청구서</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            박스 크기마다 요금이 달라서 건당 어림값은 정확하지 않아요. 청구서는
            다음 달 말에 오니까(6월 발송분 → 7월 말 청구), 받으신 금액을{" "}
            <b>발송한 달</b>에 적어주시면 그 달 장부가 실제 금액으로 바뀝니다.
          </p>
        </div>

        {waiting.length > 0 && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
            아직 청구서를 안 적은 달이 있어요 —{" "}
            <b>
              {waiting.map((m) => m.replace("-", ". ")).join(", ")} 발송분
            </b>
            . 그때까지는 건당 어림값으로 계산 중이라 그 달 손익이 바뀔 수 있어요.
          </p>
        )}

        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <CourierBillForm
            months={billMonths}
            defaultMonth={defaultBillMonth}
          />

          <div className="flex flex-col gap-1">
            {bills.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-200 py-8 text-center text-sm text-zinc-500">
                아직 적어둔 청구서가 없어요. 지금은 건당 어림값으로 계산 중입니다.
              </p>
            ) : (
              bills.map((b) => (
                <div
                  key={b.month}
                  className="flex items-center justify-between gap-3 border-b border-zinc-100 py-2 text-sm last:border-b-0"
                >
                  <span className="shrink-0 tabular-nums">
                    {b.month.replace("-", ". ")} 발송분
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-zinc-400">
                    {b.billedMonth?.replace("-", ". ")} 말 청구
                    {b.memo ? ` · ${b.memo}` : ""}
                    {estimates.has(b.month) && (
                      <span className="ml-1.5">
                        (어림값보다{" "}
                        {b.amount >= (estimates.get(b.month) ?? 0)
                          ? `${wonShort(b.amount - (estimates.get(b.month) ?? 0))} 더 나옴`
                          : `${wonShort((estimates.get(b.month) ?? 0) - b.amount)} 덜 나옴`}
                        )
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {won(b.amount)}
                  </span>
                  <RemoveButton
                    onRemove={async () => {
                      "use server";
                      await deleteCourierBillAction(b.month);
                    }}
                    confirmText={`${b.month.replace("-", ". ")} 발송분 청구서를 지울까요?`}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 지출 입력 + 목록 */}
      <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="flex flex-col gap-4">
          <ExpenseForm today={selectedDay ?? today} />
          <div className="card flex flex-col gap-3">
            <p className="text-sm font-semibold">고정비</p>
            <p className="text-xs text-zinc-500">
              매달 똑같이 나가는 돈이에요. 한 번만 등록하면 매달 자동으로 빠집니다.
            </p>
            {fixedCosts.length === 0 ? (
              <p className="text-xs text-zinc-400">아직 등록한 고정비가 없어요.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {fixedCosts.map((cost) => (
                  <div
                    key={cost.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span
                      className={cost.isActive ? "" : "text-zinc-400 line-through"}
                    >
                      {cost.name}
                      <span className="ml-1.5 text-xs text-zinc-400">
                        {cost.category}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="tabular-nums">{won(cost.amount)}</span>
                      <ToggleFixed id={cost.id} isActive={cost.isActive} />
                      <RemoveButton
                        onRemove={async () => {
                          "use server";
                          await deleteFixedCostAction(cost.id);
                        }}
                        confirmText={`${cost.name} 고정비를 지울까요?`}
                      />
                    </span>
                  </div>
                ))}
              </div>
            )}
            <FixedCostForm />
          </div>
        </div>

        <div className="card flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">
              {month.replace("-", ". ")} 지출 내역
            </p>
            <span className="text-xs text-zinc-400">
              {expenses.length}건 · {won(summary.otherExpense)}
            </span>
          </div>

          {expenses.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-200 py-10 text-center text-sm text-zinc-500">
              이번 달에 적은 지출이 없어요.
            </p>
          ) : (
            <div className="flex flex-col">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between gap-3 border-b border-zinc-100 py-2.5 text-sm last:border-b-0"
                >
                  <span className="w-16 shrink-0 text-xs text-zinc-400 tabular-nums">
                    {formatDateOnly(expense.spentAt).slice(5)}
                  </span>
                  <span className="chip shrink-0 bg-zinc-100 text-zinc-600">
                    {expense.category}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-zinc-600">
                    {expense.memo ?? "-"}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {won(expense.amount)}
                  </span>
                  <RemoveButton
                    onRemove={async () => {
                      "use server";
                      await deleteExpenseAction(expense.id);
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Row({
  label,
  value,
  auto,
  badge,
  note,
  strong,
}: {
  label: string;
  value: number;
  auto?: boolean;
  badge?: string;
  note?: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 py-1.5 text-sm ${
        strong ? "mt-1 border-t border-zinc-200 pt-2 font-bold" : ""
      }`}
    >
      <span className={strong ? "" : "text-zinc-500"}>
        {label}
        {auto && (
          <span className="ml-1.5 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">
            자동
          </span>
        )}
        {badge && (
          <span className="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700">
            {badge}
          </span>
        )}
        {note && (
          <span className="ml-1.5 text-[11px] text-amber-600">{note}</span>
        )}
      </span>
      <span className="tabular-nums">{won(value)}</span>
    </div>
  );
}

function ToggleFixed({ id, isActive }: { id: number; isActive: boolean }) {
  return (
    <form
      action={async () => {
        "use server";
        await toggleFixedCostAction(id, !isActive);
      }}
    >
      <button
        type="submit"
        className={`chip ${
          isActive
            ? "bg-emerald-100 text-emerald-700"
            : "bg-zinc-100 text-zinc-500"
        }`}
      >
        {isActive ? "사용중" : "중지"}
      </button>
    </form>
  );
}
