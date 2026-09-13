"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { choosePendingCouponAction } from "@/app/actions/coupons";
import { couponLabel } from "@/lib/coupon";

type CouponRow = {
  id: number;
  name: string;
  type: string;
  value: number;
  minAmount: number;
};

/// 다음 배송에 쓸 쿠폰을 미리 골라두는 칸. 방송이 끝나면 자동으로 적용됨
export function CouponPicker({
  coupons,
  selectedId,
}: {
  coupons: CouponRow[];
  selectedId: number | null;
}) {
  const [value, setValue] = useState(selectedId ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (coupons.length === 0) return null;

  return (
    <div className="card flex flex-col gap-2">
      <p className="text-sm font-semibold">쿠폰</p>
      <p className="text-xs text-zinc-500">
        고르시면 방송이 끝나고 배송될 때 자동으로 깎아드려요.
      </p>
      <select
        id="pendingCoupon"
        className="input"
        value={value}
        disabled={pending}
        onChange={(event) => {
          const next = Number(event.target.value);
          setValue(next);
          setError(null);
          startTransition(async () => {
            const result = await choosePendingCouponAction(next);
            if (result && "error" in result && result.error) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
      >
        <option value={0}>사용 안 함</option>
        {coupons.map((coupon) => (
          <option key={coupon.id} value={coupon.id}>
            {couponLabel(coupon)}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {!error && value > 0 && (
        <p className="text-xs font-medium text-emerald-600">
          이번 배송에 적용됩니다.
        </p>
      )}
    </div>
  );
}
