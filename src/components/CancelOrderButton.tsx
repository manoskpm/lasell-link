"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelOrderAction, restoreOrderAction } from "@/app/actions/orders";

export function CancelOrderButton({
  orderId,
  canceled,
  shipped,
}: {
  orderId: number;
  canceled: boolean;
  shipped: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (canceled) {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm("취소를 되돌릴까요? 재고가 다시 차감돼요.")) return;
          startTransition(async () => {
            await restoreOrderAction(orderId);
            router.refresh();
          });
        }}
        className="btn-secondary"
      >
        {pending ? "처리 중..." : "취소 되돌리기"}
      </button>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full py-3 text-sm text-red-500"
      >
        주문 취소하기
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5">
      <p className="text-sm font-semibold text-red-700">주문 취소</p>
      <p className="text-xs text-red-600">
        {shipped
          ? "이미 발송된 주문이라 재고는 그대로 둡니다. 반품 받으면 재고를 직접 올려주세요."
          : "취소하면 상품 재고가 자동으로 다시 채워져요."}
      </p>
      <input
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="취소 사유 (예: 손님 요청, 품절)"
        className="input"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 rounded-xl border border-zinc-300 bg-white py-2.5 text-sm"
        >
          그만두기
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await cancelOrderAction(orderId, reason);
              if (result?.error) {
                setError(result.error);
                return;
              }
              setOpen(false);
              router.refresh();
            });
          }}
          className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "취소 중..." : "취소 확정"}
        </button>
      </div>
    </div>
  );
}
