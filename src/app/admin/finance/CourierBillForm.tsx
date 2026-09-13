"use client";

import { useActionState } from "react";
import { saveCourierBillAction } from "@/app/actions/finance";
import { shiftMonth } from "@/lib/month";

function monthText(month: string) {
  return `${Number(month.slice(5, 7))}월`;
}

/// 택배사 청구서는 보통 한 달 늦게 온다.
/// 그래서 "청구서를 받은 달"이 아니라 "발송한 달"에 넣어야 그달 손익이 맞는다
export function CourierBillForm({
  months,
  defaultMonth,
  defaultAmount,
}: {
  months: string[];
  defaultMonth: string;
  defaultAmount?: number;
}) {
  const [state, formAction, pending] = useActionState(
    saveCourierBillAction,
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="label" htmlFor="billMonth">
            발송한 달
          </label>
          <select
            id="billMonth"
            name="month"
            className="input"
            defaultValue={defaultMonth}
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {m.replace("-", ". ")} 발송분
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="billAmount">
            청구 금액 (원)
          </label>
          <input
            id="billAmount"
            name="amount"
            type="number"
            inputMode="numeric"
            min={0}
            className="input"
            placeholder="820000"
            defaultValue={defaultAmount || ""}
            required
          />
        </div>
      </div>

      <input
        name="memo"
        className="input"
        placeholder="예) CJ대한통운 청구서"
      />

      <p className="text-xs text-zinc-400">
        {monthText(shiftMonth(defaultMonth, 1))}에 받은 청구서가{" "}
        {monthText(defaultMonth)} 발송분이에요.
      </p>

      {state?.error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-secondary">
        {pending ? "저장 중..." : "청구서 저장"}
      </button>
    </form>
  );
}
