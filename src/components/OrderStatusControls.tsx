"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  updatePaymentStatusAction,
  updateShippingStatusAction,
} from "@/app/actions/orders";

const PAYMENT_OPTIONS = ["미입금", "입금완료"];
const SHIPPING_OPTIONS = ["접수전", "접수완료", "발송완료"];

export function OrderStatusControls({
  settlementId,
  paymentStatus,
  shippingStatus,
}: {
  settlementId: number;
  paymentStatus: string;
  shippingStatus: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function update(action: () => Promise<void>) {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  }

  return (
    <div className={`flex flex-col gap-4 ${pending ? "opacity-50" : ""}`}>
      <div>
        <p className="label">입금 상태</p>
        <div className="flex gap-2">
          {PAYMENT_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() =>
                update(() => updatePaymentStatusAction(settlementId, option))
              }
              className={`flex-1 rounded-xl border px-3 py-3 text-sm font-medium ${
                paymentStatus === option
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 bg-white text-zinc-700"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="label">배송 상태</p>
        <div className="flex gap-2">
          {SHIPPING_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() =>
                update(() => updateShippingStatusAction(settlementId, option))
              }
              className={`flex-1 rounded-xl border px-3 py-3 text-sm font-medium ${
                shippingStatus === option
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 bg-white text-zinc-700"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
