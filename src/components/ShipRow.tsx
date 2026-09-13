"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { markShippedAction } from "@/app/actions/orders";
import { buildTrackingUrl } from "@/lib/tracking";

/// 주문 목록 옆에서 운송장번호를 넣고 바로 발송완료 처리하는 버튼
export function ShipRow({
  settlementId,
  trackingNumber,
  shippingStatus,
  trackingUrlTemplate,
  courierName,
}: {
  settlementId: number;
  trackingNumber: string | null;
  shippingStatus: string;
  trackingUrlTemplate: string | null;
  courierName: string | null;
}) {
  const [value, setValue] = useState(trackingNumber ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const trackingUrl = buildTrackingUrl(trackingUrlTemplate, trackingNumber);
  const shipped = shippingStatus === "발송완료";

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await markShippedAction(settlementId, value);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (shipped) {
    return (
      <div className="flex flex-col items-start gap-1">
        <p className="text-xs text-zinc-500">
          운송장 <span className="font-medium text-zinc-800">{trackingNumber}</span>
        </p>
        {trackingUrl ? (
          <Link
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="chip bg-blue-50 text-blue-700"
          >
            {courierName ?? "택배"} 배송조회
          </Link>
        ) : (
          <span className="text-xs text-zinc-400">
            설정에서 배송조회 주소를 넣어주세요
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          inputMode="numeric"
          placeholder="운송장번호"
          className="w-36 rounded-lg border border-zinc-300 px-2.5 py-2 text-sm"
        />
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="shrink-0 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "처리중" : "발송완료"}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
