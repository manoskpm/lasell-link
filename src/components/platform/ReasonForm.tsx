"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";
import { KeepValuesForm } from "@/components/KeepValuesForm";

/// 거절·정지처럼 "이유"를 꼭 적어야 하는 운영자 동작용 입력 틀
export function ReasonForm({
  action,
  hiddenName,
  hiddenValue,
  label,
  hint,
  placeholder,
  submitLabel,
  doneMessage,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  hiddenName: string;
  hiddenValue: number;
  label: string;
  hint: string;
  placeholder: string;
  submitLabel: string;
  doneMessage: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const done = state !== null && !state.error;

  if (done) {
    return (
      <p className="rounded-xl bg-zinc-100 px-3 py-2 text-sm text-zinc-700">{doneMessage}</p>
    );
  }

  return (
    <KeepValuesForm action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name={hiddenName} value={hiddenValue} />
      <label htmlFor={`reason-${hiddenValue}`} className="text-sm font-semibold">
        {label}
      </label>
      <p className="-mt-1 text-xs text-zinc-500">{hint}</p>
      <textarea
        id={`reason-${hiddenValue}`}
        name="reason"
        rows={3}
        className="input resize-none text-sm"
        placeholder={placeholder}
      />
      {state?.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-secondary border-red-200 text-red-700">
        {pending ? "처리하는 중…" : submitLabel}
      </button>
    </KeepValuesForm>
  );
}
