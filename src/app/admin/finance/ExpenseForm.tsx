"use client";

import { useActionState } from "react";
import { addExpenseAction } from "@/app/actions/finance";
import { EXPENSE_CATEGORIES } from "@/lib/financeCategories";

export function ExpenseForm({ today }: { today: string }) {
  const [state, formAction, pending] = useActionState(addExpenseAction, null);

  return (
    <form action={formAction} className="card flex flex-col gap-3">
      <p className="text-sm font-semibold">지출 기록</p>
      <p className="-mt-1 text-xs text-zinc-500">
        사입하신 날 나간 돈, 포장재, 광고비… 나간 건 다 여기에 적으시면 돼요.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="spentAt">
            날짜
          </label>
          <input
            id="spentAt"
            name="spentAt"
            type="date"
            className="input"
            defaultValue={today}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="category">
            분류
          </label>
          <select id="category" name="category" className="input">
            {EXPENSE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="amount">
          금액 (원)
        </label>
        <input
          id="amount"
          name="amount"
          type="number"
          inputMode="numeric"
          min={0}
          className="input"
          placeholder="50000"
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="memo">
          메모
        </label>
        <input
          id="memo"
          name="memo"
          className="input"
          placeholder="예) 동대문 사입, 택배 박스 100장"
        />
      </div>

      {state?.error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "기록 중..." : "지출 기록하기"}
      </button>
    </form>
  );
}
