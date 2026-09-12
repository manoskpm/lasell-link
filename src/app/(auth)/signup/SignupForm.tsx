"use client";

import { useActionState } from "react";
import { signupAction } from "@/app/actions/auth";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className="label" htmlFor="loginId">
          아이디 *
        </label>
        <input
          id="loginId"
          name="loginId"
          className="input"
          placeholder="영문/숫자 또는 이메일"
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="password">
          비밀번호 * (6자 이상)
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          required
          minLength={6}
        />
      </div>
      <div>
        <label className="label" htmlFor="name">
          이름 *
        </label>
        <input id="name" name="name" className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="phone">
          연락처 *
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          className="input"
          placeholder="010-1234-5678"
          required
        />
      </div>

      <div className="h-px bg-zinc-100" />
      <p className="text-sm font-semibold text-zinc-700">배송지 정보</p>

      <div>
        <label className="label" htmlFor="zipcode">
          우편번호
        </label>
        <input
          id="zipcode"
          name="zipcode"
          inputMode="numeric"
          className="input"
          placeholder="06236"
        />
      </div>
      <div>
        <label className="label" htmlFor="address">
          주소
        </label>
        <input
          id="address"
          name="address"
          className="input"
          placeholder="서울시 강남구 테헤란로 123"
        />
      </div>
      <div>
        <label className="label" htmlFor="addressDetail">
          상세주소
        </label>
        <input
          id="addressDetail"
          name="addressDetail"
          className="input"
          placeholder="101동 1001호"
        />
      </div>

      {state?.error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary mt-2">
        {pending ? "가입 중..." : "가입하고 시작하기"}
      </button>
    </form>
  );
}
