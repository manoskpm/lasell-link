"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toggleCouponActiveAction } from "@/app/actions/coupons";

export function CouponToggle({
  couponId,
  isActive,
}: {
  couponId: number;
  isActive: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await toggleCouponActiveAction(couponId, !isActive);
          router.refresh();
        })
      }
      className={`chip shrink-0 ${
        isActive ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"
      }`}
    >
      {isActive ? "사용중" : "꺼짐"}
    </button>
  );
}
