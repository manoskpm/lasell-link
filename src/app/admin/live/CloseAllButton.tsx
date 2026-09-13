"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  closeBroadcastAction,
  type CloseBroadcastResult,
} from "@/app/actions/live";

/// 방송 종료: 오픈중인 상품을 내리고, 오늘 구매분을 손님별로 묶어 배송 대기로 넘김
export function CloseAllButton({ count }: { count: number }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CloseBroadcastResult | null>(null);
  const router = useRouter();

  if (result) {
    return (
      <div className="flex flex-col gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm">
        <p className="font-semibold text-emerald-800">방송을 종료했어요</p>
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
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            `방송을 종료할까요?\n\n오픈중인 상품 ${count}개가 내려가고,\n오늘 구매분이 손님별로 묶여 배송 대기로 넘어갑니다.`
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
      {pending ? "정리하는 중..." : "방송종료 · 배송 넘기기"}
    </button>
  );
}
