"use client";

import { useActionState, useState } from "react";
import { saveCourierBillAction } from "@/app/actions/finance";
import { shiftMonth } from "@/lib/month";

function monthText(month: string) {
  return `${Number(month.slice(5, 7))}월`;
}

function short(value: number) {
  if (Math.abs(value) >= 10_000) return `${Math.round(value / 10_000)}만원`;
  return `${value.toLocaleString("ko-KR")}원`;
}

/// 택배사 청구서는 보통 한 달 늦게 온다.
/// 그래서 "청구서를 받은 달"이 아니라 "발송한 달"에 넣어야 그달 손익이 맞는다
export function CourierBillForm({
  months,
  defaultMonth,
  estimates,
}: {
  months: string[];
  defaultMonth: string;
  estimates: Record<string, number>;
}) {
  const [state, formAction, pending] = useActionState(
    saveCourierBillAction,
    null
  );
  const [month, setMonth] = useState(defaultMonth);
  const [amount, setAmount] = useState("");

  const guess = estimates[month] ?? 0;
  const typed = Number(amount) || 0;
  // 예상보다 2배 넘게 차이나면 달을 잘못 골랐을 가능성이 크다
  const odd = guess > 0 && typed > 0 && Math.abs(typed - guess) > guess;

  return (
    <form action={formAction} className="flex flex-col gap-2.5">
      <div>
        <label className="label" htmlFor="billMonth">
          택배를 보낸 달
        </label>
        <select
          id="billMonth"
          name="month"
          className="input"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {monthText(m)} 발송분 ({monthText(shiftMonth(m, 1))} 말 청구서)
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-zinc-500">
          {monthText(shiftMonth(month, 1))} 말에 받은 청구서라면 이게 맞아요.
          적으면 <b>{monthText(month)} 장부</b>에 들어갑니다.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="billAmount">
          청구된 금액 (원)
        </label>
        <input
          id="billAmount"
          name="amount"
          type="number"
          inputMode="numeric"
          min={0}
          className="input"
          placeholder="820000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        {guess > 0 && (
          <p className="mt-1 text-xs text-zinc-400">
            {monthText(month)} 예상 택배비는 {short(guess)}이었어요.
          </p>
        )}
      </div>

      <input name="memo" className="input" placeholder="예) CJ대한통운 청구서" />

      {odd && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
          예상({short(guess)})이랑 차이가 많이 나요. 택배를 보낸 달이{" "}
          {monthText(month)}가 맞는지 한 번만 확인해주세요.
        </p>
      )}

      {state?.error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-secondary">
        {pending ? "저장 중..." : `${monthText(month)} 장부에 넣기`}
      </button>
    </form>
  );
}
