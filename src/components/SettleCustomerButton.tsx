"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { settleCustomerNowAction } from "@/app/actions/orders";

/// 이 손님의 보관중인 주문 전부를 지금 바로 배송 대기(정산)로 묶음.
/// 손님은 아무것도 누를 필요 없고, 셀러가 필요할 때 화면에서 직접 누름
export function SettleCustomerButton({
  userId,
  buyerName,
}: {
  userId: number;
  buyerName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [settlementId, setSettlementId] = useState<number | null>(null);
  const router = useRouter();

  if (settlementId) {
    return (
      <p className="text-xs font-medium text-emerald-600">
        정산 #{settlementId}로 묶였어요.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (
            !confirm(
              `${buyerName}님의 보관중인 주문을 지금 배송 대기로 묶을까요?\n\n이 손님이 아직 안 낸 다른 보관중인 주문도 함께 묶여요.`
            )
          ) {
            return;
          }
          setError(null);
          startTransition(async () => {
            const result = await settleCustomerNowAction(userId);
            if ("error" in result) {
              setError(result.error);
              return;
            }
            setSettlementId(result.settlementId);
            router.refresh();
          });
        }}
        className="chip self-start bg-zinc-900 text-white disabled:opacity-50"
      >
        {pending ? "묶는 중..." : "이 손님 먼저 보내기"}
      </button>
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
