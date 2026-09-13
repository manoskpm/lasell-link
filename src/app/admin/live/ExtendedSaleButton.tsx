"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  cancelExtendedSaleAction,
  startExtendedSaleAction,
  type SalePreset,
} from "@/app/actions/live";

/// 마감 시각은 서버에서 한국시간 기준으로 계산한다
const PRESETS: { label: string; preset: SalePreset }[] = [
  { label: "오늘 밤 12시", preset: "midnight" },
  { label: "내일 오전 10시", preset: "tomorrow10" },
  { label: "3시간 뒤", preset: "h3" },
  { label: "6시간 뒤", preset: "h6" },
];

export function ExtendedSaleButton({
  closesAt,
}: {
  closesAt: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function apply(preset: SalePreset) {
    setError(null);
    startTransition(async () => {
      const result = await startExtendedSaleAction(preset);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  if (closesAt) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-sm">
        <span className="font-semibold text-rose-700">연장판매 중</span>
        <span className="text-rose-600">{closesAt}까지</span>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await cancelExtendedSaleAction();
              router.refresh();
            })
          }
          className="text-xs text-rose-700 underline disabled:opacity-50"
        >
          해제
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="chip bg-zinc-100 text-zinc-700"
      >
        ⏰ 연장판매 열기
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-3">
      <p className="text-sm font-semibold">언제까지 열어둘까요?</p>
      <p className="text-xs text-zinc-500">
        방송은 끝났지만 포장 전까지 계속 팔 수 있어요. 이 시간까지 들어온 주문은
        이번 배송에 같이 나갑니다.
      </p>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.preset}
            type="button"
            disabled={pending}
            onClick={() => apply(preset.preset)}
            className="chip bg-zinc-900 text-white disabled:opacity-50"
          >
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="chip bg-zinc-100 text-zinc-600"
        >
          그만두기
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
