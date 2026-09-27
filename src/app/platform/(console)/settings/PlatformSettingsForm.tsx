"use client";

import { useActionState, useState } from "react";
import { updatePlatformSettingsAction } from "@/app/actions/platform";
import { KeepValuesForm } from "@/components/KeepValuesForm";

export function PlatformSettingsForm({
  defaults,
}: {
  defaults: {
    acceptingApplications: boolean;
    lowStockAtMin: string;
    lowStockAtMax: string;
    operatorContactKakaoUrl: string;
    operatorContactPhone: string;
  };
}) {
  const [state, formAction, pending] = useActionState(
    updatePlatformSettingsAction,
    null
  );
  const [accepting, setAccepting] = useState(defaults.acceptingApplications);
  const errorField = state?.field;

  return (
    <KeepValuesForm action={formAction} className="card flex max-w-lg flex-col gap-4">
      <div>
        <p className="text-sm font-semibold">셀러 신청 접수</p>
        <label className="mt-2 flex items-center gap-3 rounded-xl border border-zinc-200 px-3.5 py-3">
          <input
            type="checkbox"
            name="acceptingApplications"
            checked={accepting}
            onChange={(event) => setAccepting(event.target.checked)}
            className="h-5 w-5"
          />
          <span className="text-sm">
            <b>새 셀러 신청을 받는 중</b>
            <span className="block text-xs text-zinc-500">
              꺼두면 신청 화면에 &apos;지금은 신청을 받지 않아요&apos;라고
              나오고, 이미 들어온 신청은 그대로 심사할 수 있어요.
            </span>
          </span>
        </label>
      </div>

      <div className="h-px bg-zinc-100" />
      <div>
        <p className="text-sm font-semibold">품절임박 기준 허용 범위</p>
        <p className="mt-1 text-xs text-zinc-500">
          셀러가 자기 상점 설정에서 정할 수 있는 &apos;품절임박&apos; 기준
          수량의 최소·최대값이에요.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          id="lowStockAtMin"
          label="최소 (개)"
          error={errorField === "lowStockAtMin" ? state?.error : undefined}
        >
          <input
            id="lowStockAtMin"
            name="lowStockAtMin"
            type="number"
            inputMode="numeric"
            min={1}
            className="input"
            defaultValue={defaults.lowStockAtMin}
          />
        </Field>
        <Field
          id="lowStockAtMax"
          label="최대 (개)"
          error={errorField === "lowStockAtMax" ? state?.error : undefined}
        >
          <input
            id="lowStockAtMax"
            name="lowStockAtMax"
            type="number"
            inputMode="numeric"
            min={1}
            className="input"
            defaultValue={defaults.lowStockAtMax}
          />
        </Field>
      </div>

      <div className="h-px bg-zinc-100" />
      <div>
        <p className="text-sm font-semibold">운영자 연락처</p>
        <p className="mt-1 text-xs text-zinc-500">
          상점이 정지됐을 때처럼 셀러가 운영자에게 연락해야 하는 화면에 표시돼요.
          카카오톡 채널 링크나 전화번호 중 하나만 넣어도 돼요.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="operatorContactKakaoUrl">
          카카오톡 채널 링크
        </label>
        <input
          id="operatorContactKakaoUrl"
          name="operatorContactKakaoUrl"
          type="url"
          className="input"
          defaultValue={defaults.operatorContactKakaoUrl}
          placeholder="http://pf.kakao.com/_xxxxxxx"
        />
      </div>
      <div>
        <label className="label" htmlFor="operatorContactPhone">
          전화번호
        </label>
        <input
          id="operatorContactPhone"
          name="operatorContactPhone"
          type="tel"
          className="input"
          defaultValue={defaults.operatorContactPhone}
          placeholder="010-0000-0000"
        />
      </div>

      {state?.error && !["lowStockAtMin", "lowStockAtMax"].includes(errorField ?? "") && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state && !state.error && (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          저장했어요.
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "저장 중..." : "저장"}
      </button>
    </KeepValuesForm>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={error ? "rounded-xl bg-red-50 p-3 ring-2 ring-red-300" : ""}>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
