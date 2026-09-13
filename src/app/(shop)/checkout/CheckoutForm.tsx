"use client";

import { useActionState, useState } from "react";
import { placeOrderAction } from "@/app/actions/orders";

export function CheckoutForm() {
  const [state, formAction, pending] = useActionState(placeOrderAction, null);
  // 결제창을 열 때 한 번 발급되는 값. 실수로 두 번 눌러도 주문은 한 건만 들어감
  const [clientToken] = useState(() => crypto.randomUUID());

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="clientToken" value={clientToken} />
      <div>
        <label className="label" htmlFor="memo">
          요청사항 (선택)
        </label>
        <textarea
          id="memo"
          name="memo"
          rows={2}
          className="input resize-none"
          placeholder="예) 색상 변경 가능할까요?"
        />
      </div>

      {state?.error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "결제 중..." : "결제하고 상품 확보하기"}
      </button>
    </form>
  );
}
