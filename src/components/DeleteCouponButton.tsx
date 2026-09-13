"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteCouponAction } from "@/app/actions/coupons";

export function DeleteCouponButton({ couponId }: { couponId: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm("이 쿠폰을 삭제할까요?")) return;
          setError(null);
          startTransition(async () => {
            const result = await deleteCouponAction(couponId);
            if (result && "error" in result && result.error) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
        className="text-xs text-red-500 underline disabled:opacity-50"
      >
        {pending ? "삭제 중..." : "삭제"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
