"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { resumeShopAction } from "@/app/actions/platform";

export function ResumeButton({ shopId, shopName }: { shopId: number; shopName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm(`'${shopName}' 상점을 다시 열까요? 바로 손님이 살 수 있게 돼요.`)) return;
          startTransition(async () => {
            const result = await resumeShopAction(shopId);
            if (result?.error) setError(result.error);
            else router.refresh();
          });
        }}
        className="btn-primary"
      >
        {pending ? "여는 중…" : "상점 다시 열기"}
      </button>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
