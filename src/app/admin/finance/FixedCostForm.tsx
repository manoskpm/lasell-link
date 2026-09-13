"use client";

import { useActionState } from "react";
import { addFixedCostAction } from "@/app/actions/finance";
import { FIXED_CATEGORIES } from "@/lib/financeCategories";

export function FixedCostForm() {
  const [state, formAction, pending] = useActionState(addFixedCostAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-xl border border-dashed border-zinc-300 p-3.5">
      <p className="text-sm font-semibold">고정비 추가</p>

      <input
        name="name"
        className="input"
        placeholder="예) 창고 월세"
        required
      />
      <div className="grid grid-cols-2 gap-2">
        <select name="category" className="input">
          {FIXED_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <input
          name="amount"
          type="number"
          inputMode="numeric"
          min={0}
          className="input"
          placeholder="금액"
          required
        />
      </div>

      {state?.error && (
        <p className="text-xs text-red-600">{state.error}</p>
      )}

      <button type="submit" disabled={pending} className="btn-secondary">
        {pending ? "등록 중..." : "고정비 등록"}
      </button>
    </form>
  );
}
