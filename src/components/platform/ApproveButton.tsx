"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { approveSellerApplicationAction } from "@/app/actions/platform";

export function ApproveButton({
  applicationId,
  shopName,
  blockedReason,
}: {
  applicationId: number;
  shopName: string;
  /// 승인할 수 없는 이유 (있으면 버튼을 막고 이유를 보여줌)
  blockedReason?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending || Boolean(blockedReason)}
        onClick={() => {
          if (!confirm(`'${shopName}' 상점을 승인할까요? 승인하면 바로 셀러 화면을 쓸 수 있어요.`)) return;
          setError(null);
          startTransition(async () => {
            const result = await approveSellerApplicationAction(applicationId);
            if (result?.error) setError(result.error);
            else router.refresh();
          });
        }}
        className="btn-primary disabled:cursor-not-allowed"
      >
        {pending ? "승인하는 중…" : "승인하기"}
      </button>
      {blockedReason && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {blockedReason}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
