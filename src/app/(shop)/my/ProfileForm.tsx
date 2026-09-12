"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/app/actions/auth";

export function ProfileForm({
  defaults,
}: {
  defaults: {
    name: string;
    phone: string;
    zipcode: string;
    address: string;
    addressDetail: string;
  };
}) {
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-sm font-semibold">내 정보 · 기본 배송지</p>

      <div>
        <label className="label" htmlFor="name">
          이름
        </label>
        <input
          id="name"
          name="name"
          className="input"
          defaultValue={defaults.name}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="phone">
          연락처
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          className="input"
          defaultValue={defaults.phone}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="zipcode">
          우편번호
        </label>
        <input
          id="zipcode"
          name="zipcode"
          inputMode="numeric"
          className="input"
          defaultValue={defaults.zipcode}
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
          defaultValue={defaults.address}
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
          defaultValue={defaults.addressDetail}
        />
      </div>

      {state?.error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state && !state.error && (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          저장했어요.
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-secondary">
        {pending ? "저장 중..." : "배송지 저장"}
      </button>
    </form>
  );
}
