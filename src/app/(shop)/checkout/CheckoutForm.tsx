"use client";

import { useActionState } from "react";
import { placeOrderAction } from "@/app/actions/orders";

const PAYMENT_METHODS = ["계좌이체", "카드", "기타"];

export function CheckoutForm({
  defaults,
  bankAccount,
}: {
  defaults: {
    buyerName: string;
    buyerPhone: string;
    zipcode: string;
    address: string;
    addressDetail: string;
  };
  bankAccount: string | null;
}) {
  const [state, formAction, pending] = useActionState(placeOrderAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-sm font-semibold">배송지</p>

      <div>
        <label className="label" htmlFor="buyerName">
          받는분 이름 *
        </label>
        <input
          id="buyerName"
          name="buyerName"
          className="input"
          defaultValue={defaults.buyerName}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="buyerPhone">
          연락처 *
        </label>
        <input
          id="buyerPhone"
          name="buyerPhone"
          type="tel"
          className="input"
          defaultValue={defaults.buyerPhone}
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
          주소 *
        </label>
        <input
          id="address"
          name="address"
          className="input"
          defaultValue={defaults.address}
          required
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
      <div>
        <label className="label" htmlFor="memo">
          요청사항
        </label>
        <textarea
          id="memo"
          name="memo"
          rows={2}
          className="input resize-none"
          placeholder="예) 부재시 문앞에 놔주세요"
        />
      </div>

      <div className="h-px bg-zinc-100" />
      <p className="text-sm font-semibold">결제</p>

      <div>
        <label className="label" htmlFor="paymentMethod">
          결제수단
        </label>
        <select id="paymentMethod" name="paymentMethod" className="input">
          {PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="depositorName">
          입금자명
        </label>
        <input
          id="depositorName"
          name="depositorName"
          className="input"
          defaultValue={defaults.buyerName}
        />
        <p className="mt-1 text-xs text-zinc-500">
          통장에 찍히는 이름이 주문자와 다르면 꼭 바꿔주세요. (가족 이름으로
          입금하는 경우 등)
        </p>
      </div>

      {bankAccount && (
        <p className="rounded-xl bg-zinc-50 px-3.5 py-3 text-sm text-zinc-600">
          입금계좌: <b className="text-zinc-900">{bankAccount}</b>
          <br />
          주문 후 입금해주시면 확인 뒤 발송해드려요.
        </p>
      )}

      {state?.error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "주문 중..." : "주문 완료하기"}
      </button>
    </form>
  );
}
