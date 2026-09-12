"use client";

import { useActionState } from "react";
import { createTemplateAction } from "@/app/actions/courier";

export function NewTemplateForm() {
  const [state, formAction, pending] = useActionState(
    createTemplateAction,
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className="label" htmlFor="name">
          양식 이름 *
        </label>
        <input
          id="name"
          name="name"
          className="input"
          placeholder="예) 한진택배 대량접수"
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="file">
          엑셀 양식 파일 (.xlsx) *
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".xlsx,.xlsm"
          className="w-full text-sm"
          required
        />
        <p className="mt-1 text-xs text-zinc-500">
          택배사 양식이 구버전(.xls)이면 엑셀에서 열어 &apos;다른 이름으로 저장
          → xlsx&apos;로 바꿔서 올려주세요.
        </p>
      </div>

      {state?.error && (
        <p className="rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "읽는 중..." : "올리고 칸 확인하기"}
      </button>
    </form>
  );
}
