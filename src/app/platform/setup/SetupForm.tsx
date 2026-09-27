"use client";

import { useActionState } from "react";
import { KeepValuesForm } from "@/components/KeepValuesForm";
import { platformSetupAction } from "@/app/actions/platform";

export function SetupForm() {
  const [state, formAction, pending] = useActionState(platformSetupAction, null);

  return (
    <KeepValuesForm action={formAction} className="flex flex-col gap-4">
      <div>
        <label className="label" htmlFor="setupCode">
          설치 코드
        </label>
        <input
          id="setupCode"
          name="setupCode"
          type="password"
          className="input"
          autoComplete="off"
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="loginId">
          운영자 아이디
        </label>
        <input id="loginId" name="loginId" className="input" autoComplete="off" required />
      </div>
      <div>
        <label className="label" htmlFor="password">
          비밀번호 (10자 이상)
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          autoComplete="new-password"
          minLength={10}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="name">
            이름
          </label>
          <input id="name" name="name" className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="phone">
            연락처
          </label>
          <input id="phone" name="phone" className="input" inputMode="tel" required />
        </div>
      </div>

      {state?.error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary mt-2">
        {pending ? "만드는 중..." : "운영자 계정 만들기"}
      </button>
    </KeepValuesForm>
  );
}
