"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelSettlementAction } from "@/app/actions/orders";

/// 배송묶음(정산) 취소. 묶인 주문들은 다시 배송대기로 돌아감
export function CancelOrderButton({
  settlementId,
  canceled,
}: {
  settlementId: number;
  canceled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (canceled) {
    return (
      <p className="py-3 text-center text-sm text-zinc-400">
        취소된 정산이에요. 묶여 있던 주문은 배송대기로 돌아갔어요.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full py-3 text-sm text-red-500"
      >
        정산 취소하기
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5">
      <p className="text-sm font-semibold text-red-700">정산 취소</p>
      <p className="text-xs text-red-600">
        취소하면 묶여 있던 주문들이 배송대기로 돌아가요. 상품 재고는
        그대로 유지돼요.
      </p>
      <input
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="취소 사유 (예: 손님 요청, 배송지 변경)"
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
              const result = await cancelSettlementAction(settlementId, reason);
              if (result && "error" in result && result.error) {
                setError(String(result.error));
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
