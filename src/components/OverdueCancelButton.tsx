"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelOverdueSettlementAction } from "@/app/actions/orders";

/// 입금 기한이 지난 '미입금' 정산을 셀러가 확인하고 취소하는 버튼.
/// 자동으로 취소되지 않고, 셀러가 내용을 보고 직접 눌러야만 처리된다.
export function OverdueCancelButton({ settlementId }: { settlementId: number }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("입금 기한이 지나 취소됐어요.");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-xl bg-red-500 py-3 text-sm font-semibold text-white"
      >
        입금 기한 지남 — 확인하고 취소하기
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5">
      <p className="text-sm font-semibold text-red-700">기한 초과 취소</p>
      <p className="text-xs text-red-600">
        취소하면 묶여 있던 주문이 모두 취소되고, 담아뒀던 재고는 다른 손님이
        살 수 있게 바로 돌아가요. 되돌릴 수 없으니 입금 여부를 한 번 더
        확인해주세요.
      </p>
      <input
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="취소 사유 (손님에게 보여요)"
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
              const result = await cancelOverdueSettlementAction(
                settlementId,
                reason
              );
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
