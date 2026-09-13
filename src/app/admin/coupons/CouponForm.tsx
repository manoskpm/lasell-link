"use client";

import { useActionState, useState } from "react";
import { createCouponAction } from "@/app/actions/coupons";

const TYPE_OPTIONS = [
  { value: "AMOUNT", label: "정액 할인 (원)" },
  { value: "PERCENT", label: "정률 할인 (%)" },
  { value: "FREE_SHIPPING", label: "배송비 무료" },
];

export function CouponForm() {
  const [state, formAction, pending] = useActionState(createCouponAction, null);
  const [type, setType] = useState("AMOUNT");

  return (
    <form action={formAction} className="card flex flex-col gap-3">
      <p className="text-sm font-semibold">쿠폰 만들기</p>

      <div>
        <label className="label" htmlFor="name">
          쿠폰 이름 *
        </label>
        <input
          id="name"
          name="name"
          className="input"
          placeholder="예) 신규가입 쿠폰"
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="type">
          종류
        </label>
        <select
          id="type"
          name="type"
          className="input"
          value={type}
          onChange={(event) => setType(event.target.value)}
        >
          {TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {type !== "FREE_SHIPPING" && (
        <div>
          <label className="label" htmlFor="value">
            {type === "PERCENT" ? "할인율 (%)" : "할인 금액 (원)"} *
          </label>
          <input
            id="value"
            name="value"
            type="number"
            inputMode="numeric"
            min={0}
            max={type === "PERCENT" ? 100 : undefined}
            className="input"
            placeholder={type === "PERCENT" ? "10" : "3000"}
            required
          />
        </div>
      )}

      <div>
        <label className="label" htmlFor="minAmount">
          최소 주문금액 (선택)
        </label>
        <input
          id="minAmount"
          name="minAmount"
          type="number"
          inputMode="numeric"
          min={0}
          className="input"
          placeholder="비우면 제한 없음"
        />
      </div>

      <div>
        <label className="label" htmlFor="expiresAt">
          사용기한 (선택)
        </label>
        <input id="expiresAt" name="expiresAt" type="date" className="input" />
      </div>

      {state?.error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "만드는 중..." : "쿠폰 만들기"}
      </button>
    </form>
  );
}
