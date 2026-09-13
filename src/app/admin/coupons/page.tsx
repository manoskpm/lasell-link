import { CouponForm } from "./CouponForm";
import { CouponToggle } from "@/components/CouponToggle";
import { DeleteCouponButton } from "@/components/DeleteCouponButton";
import { couponLabel } from "@/lib/coupon";
import { formatDateOnly } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function AdminCouponsPage() {
  const coupons = await prisma.coupon.findMany({
    include: { _count: { select: { settlements: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-4 lg:order-2">
        <CouponForm />
      </div>

      <div className="flex flex-col gap-4 lg:order-1">
        <div>
          <h1 className="text-xl font-bold lg:text-2xl">쿠폰</h1>
          <p className="mt-1 text-sm text-zinc-500">
            손님이 정산(합배송)할 때 쿠폰을 하나 골라 쓸 수 있어요. 조건을
            만족하는 쿠폰만 손님 화면에 보여요.
          </p>
        </div>

        {coupons.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-200 bg-white py-14 text-center text-sm text-zinc-500">
            아직 만든 쿠폰이 없어요. 오른쪽에서 만들어보세요.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {coupons.map((coupon) => {
              const expired = coupon.expiresAt && coupon.expiresAt < new Date();
              return (
                <div
                  key={coupon.id}
                  className="card flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {couponLabel(coupon)}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      사용 {coupon._count.settlements}건
                      {coupon.expiresAt && (
                        <>
                          {" "}
                          · {expired ? "기한만료" : "사용기한"}{" "}
                          {formatDateOnly(coupon.expiresAt)}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <CouponToggle
                      couponId={coupon.id}
                      isActive={coupon.isActive}
                    />
                    {coupon._count.settlements === 0 && (
                      <DeleteCouponButton couponId={coupon.id} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
