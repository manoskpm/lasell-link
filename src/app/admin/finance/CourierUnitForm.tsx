"use client";

import { useActionState } from "react";
import { updateCourierUnitCostAction } from "@/app/actions/finance";

/// 청구서를 적기 전까지 쓰는 건당 어림값
export function CourierUnitForm({ value }: { value: number }) {
  const [state, formAction, pending] = useActionState(
    updateCourierUnitCostAction,
    null
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-zinc-600">건당</span>
      <div className="w-28">
        <input
          name="courierCost"
          type="number"
          inputMode="numeric"
          min={0}
          defaultValue={value}
          className="input"
        />
      </div>
      <span className="text-sm text-zinc-600">원</span>
      <button type="submit" disabled={pending} className="chip bg-zinc-100 text-zinc-600">
        {pending ? "저장 중..." : "저장"}
      </button>
      {state?.error && (
        <span className="text-xs text-red-600">{state.error}</span>
      )}
    </form>
  );
}
