"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  closeBroadcastAction,
  type CloseBroadcastResult,
} from "@/app/actions/live";

/// 판매 마감: 오픈중인 상품을 내리고, 아직 안 나간 구매분을 손님별로 묶어 배송 대기로 넘김
export function CloseAllButton({
  count,
  pendingOrders,
}: {
  count: number;
  pendingOrders: number;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CloseBroadcastResult | null>(null);
  const router = useRouter();

  if (result) {
    return (
      <div className="flex flex-col gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm">
        <p className="font-semibold text-emerald-800">판매를 마감했어요</p>
        <p className="text-emerald-700">
          상품 {result.closedProducts}개 마감 · 손님 {result.shippedCustomers}명
          / 주문 {result.shippedOrders}건이 배송 대기로 넘어갔어요.
        </p>
        {result.missingAddress.length > 0 && (
          <p className="text-amber-700">
            배송지가 없어 넘기지 못한 손님: {result.missingAddress.join(", ")} —
            주소를 받아서 정산 화면에서 직접 넣어주세요.
          </p>
        )}
        <a href="/admin/settlements" className="font-semibold underline">
          정산 · 배송 화면으로 →
        </a>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={pending || (count === 0 && pendingOrders === 0)}
      onClick={() => {
        if (
          !confirm(
            `판매를 마감할까요?\n\n오픈중인 상품 ${count}개가 내려가고,\n아직 안 나간 주문 ${pendingOrders}건이 손님별로 묶여 배송 대기로 넘어갑니다.`
          )
        ) {
          return;
        }
        startTransition(async () => {
          const outcome = await closeBroadcastAction();
          setResult(outcome);
          router.refresh();
        });
      }}
      className="chip bg-zinc-900 text-white disabled:opacity-50"
    >
      {pending
        ? "정리하는 중..."
        : count === 0 && pendingOrders === 0
          ? "넘길 주문 없음"
          : `마감 · 배송 넘기기 (${pendingOrders}건)`}
    </button>
  );
}
