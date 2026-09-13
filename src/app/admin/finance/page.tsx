import Link from "next/link";
import { ExpenseForm } from "./ExpenseForm";
import { FixedCostForm } from "./FixedCostForm";
import { RemoveButton } from "@/components/RemoveButton";
import {
  deleteExpenseAction,
  deleteFixedCostAction,
  toggleFixedCostAction,
} from "@/app/actions/finance";
import { todayKst } from "@/lib/date";
import {
  kstMonthRange,
  monthlySummary,
  shiftMonth,
  type MonthlySummary,
} from "@/lib/finance";
import { formatDateOnly, won } from "@/lib/format";
import { prisma } from "@/lib/prisma";

/// 차트 라벨은 원 단위로 적으면 너무 길어서 만원 단위로 줄임
function wonShort(value: number) {
  const abs = Math.abs(value);
  if (abs >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}억`;
  if (abs >= 10_000) return `${Math.round(value / 10_000).toLocaleString("ko-KR")}만`;
  return value.toLocaleString("ko-KR");
}

function monthLabel(month: string) {
  return `${Number(month.slice(5, 7))}월`;
}

export default async function AdminFinancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const thisMonth = todayKst().slice(0, 7);
  const month = /^\d{4}-\d{2}$/.test(monthParam ?? "")
    ? (monthParam as string)
    : thisMonth;

  // 이번 달 상세 + 최근 6개월 추이
  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5));
  const [summary, trend, expenses, fixedCosts] = await Promise.all([
    monthlySummary(month),
    Promise.all(months.map((m) => monthlySummary(m))),
    prisma.expense.findMany({
      where: { spentAt: kstMonthRange(month) },
      orderBy: [{ spentAt: "desc" }, { id: "desc" }],
    }),
    prisma.fixedCost.findMany({ orderBy: [{ isActive: "desc" }, { id: "asc" }] }),
  ]);

  const peak = Math.max(1, ...trend.map((m) => Math.abs(m.profit)));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold lg:text-2xl">장부</h1>
          <p className="mt-1 text-sm text-zinc-500">
            매출·원가·택배비는 주문에서 자동으로 잡혀요. 사장님은 그 외에 쓴 돈만
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
          <p className="mt-0.5 text-xs text-zinc-400">
            원가·택배·고정비 포함
          </p>
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

      {/* 6개월 추이 */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold">최근 6개월 남은 돈</h2>
        <p className="mt-0.5 text-xs text-zinc-400">
          막대 위 숫자는 만원 단위예요. 기준선 아래로 내려가면 적자입니다.
        </p>

        <div className="mt-5 flex items-end gap-2 sm:gap-3">
          {trend.map((m) => {
            const ratio = Math.abs(m.profit) / peak;
            const barHeight = Math.max(3, Math.round(ratio * 88));
            const isLoss = m.profit < 0;
            const isCurrent = m.month === month;
            return (
              <div
                key={m.month}
                className="group relative flex flex-1 flex-col items-center gap-1"
              >
                {/* 값 라벨 */}
                <span
                  className={`text-[11px] font-semibold tabular-nums ${
                    isLoss ? "text-red-600" : "text-emerald-700"
                  }`}
                >
                  {wonShort(m.profit)}
                </span>

                {/* 기준선 위 영역 */}
                <div className="flex h-[92px] w-full items-end justify-center">
                  {!isLoss && (
                    <div
                      className="w-full max-w-[48px] rounded-t bg-emerald-500"
                      style={{ height: `${barHeight}px` }}
                    />
                  )}
                </div>

                {/* 0 기준선 */}
                <div className="h-px w-full bg-zinc-300" />

                {/* 기준선 아래 영역 */}
                <div className="flex h-[36px] w-full items-start justify-center">
                  {isLoss && (
                    <div
                      className="w-full max-w-[48px] rounded-b bg-red-500"
                      style={{ height: `${Math.min(36, barHeight)}px` }}
                    />
                  )}
                </div>

                <span
                  className={`text-xs tabular-nums ${
                    isCurrent ? "font-bold text-zinc-900" : "text-zinc-400"
                  }`}
                >
                  {monthLabel(m.month)}
                </span>

                {/* 마우스를 올리면 그달 요약 */}
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
            auto
          />
          <Row label="쿠폰 할인" value={summary.discount} auto />
          <Row label="고정비" value={summary.fixedCost} />
          <Row label="그 외 지출" value={summary.otherExpense} />
          <Row label="합계" value={summary.expense} strong />
        </div>
      </section>

      {/* 지출 입력 + 목록 */}
      <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="flex flex-col gap-4">
          <ExpenseForm today={todayKst()} />
          <div className="card flex flex-col gap-3">
            <p className="text-sm font-semibold">고정비</p>
            {fixedCosts.length === 0 ? (
              <p className="text-xs text-zinc-500">
                아직 등록한 고정비가 없어요.
              </p>
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
  strong,
}: {
  label: string;
  value: number;
  auto?: boolean;
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
