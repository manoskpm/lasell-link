"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className="label" htmlFor="loginId">
          아이디
        </label>
        <input id="loginId" name="loginId" className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="password">
          비밀번호
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          required
        />
      </div>

      {state?.error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary mt-2">
        {pending ? "로그인 중..." : "로그인"}
      </button>
    </form>
  );
}
