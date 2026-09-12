"use client";

import { useActionState } from "react";
import { importTrackingAction } from "@/app/actions/courier";

export function TrackingImportForm() {
  const [state, formAction, pending] = useActionState(
    importTrackingAction,
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input
        name="file"
        type="file"
        accept=".xlsx,.xlsm"
        className="w-full text-sm"
        required
      />

      {state?.error && (
        <p className="rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-600">
          {state.error}
        </p>
      )}

      {state?.updated !== undefined && (
        <div className="rounded-xl bg-emerald-50 px-3.5 py-3 text-sm text-emerald-700">
          <p>{state.updated}건에 운송장번호를 입력했어요.</p>
          {state.failed && state.failed.length > 0 && (
            <ul className="mt-1 flex flex-col gap-0.5 text-amber-700">
              {state.failed.map((message) => (
                <li key={message}>· {message}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button type="submit" disabled={pending} className="btn-secondary">
        {pending ? "읽는 중..." : "운송장 엑셀 올리기"}
      </button>
    </form>
  );
}
