import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isCouponUsable } from "@/lib/coupon";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { planShipping } from "@/lib/shippingPlan";
import { SettleForm } from "./SettleForm";

export default async function SettlePage() {
  const user = await requireUser("/login");

  const [orders, settings, coupons] = await Promise.all([
    prisma.order.findMany({
      where: { userId: user.id, settlementId: null, canceledAt: null },
      include: { items: true },
      orderBy: { createdAt: "asc" },
    }),
    getSettings(),
    prisma.coupon.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (orders.length === 0) redirect("/my/orders");

  // 배송비는 그날 결제한 금액 전부로 판정 (이미 낸 배송비가 있으면 차감/환급까지 계산)
  const plan = await planShipping(prisma, {
    userId: user.id,
    orderIds: orders.map((order) => order.id),
    shippingFee: settings.shippingFee,
    freeShippingOver: settings.freeShippingOver,
  });

  const allTotal = orders.reduce(
    (sum, order) =>
      sum + order.items.reduce((s, i) => s + i.price * i.quantity, 0),
    0
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold">먼저 배송받기</h1>
        <p className="mt-1 text-sm text-zinc-500">
          방송이 끝나면 자동으로 배송되지만, 먼저 받고 싶으시면 여기서 신청하세요.
        </p>
      </div>

      <SettleForm
        orders={orders.map((order) => ({
          id: order.id,
          createdAt: order.createdAt.toISOString(),
          total: order.items.reduce((s, i) => s + i.price * i.quantity, 0),
          items: order.items.map((item) => ({
            id: item.id,
            productName: item.productName,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
          })),
        }))}
        coupons={coupons
          .filter((coupon) => isCouponUsable(coupon, allTotal))
          .map((coupon) => ({
            id: coupon.id,
            name: coupon.name,
            type: coupon.type,
            value: coupon.value,
            minAmount: coupon.minAmount,
          }))}
        shippingPolicy={{
          shippingFee: settings.shippingFee,
          freeShippingOver: settings.freeShippingOver,
        }}
        shippingPlan={{
          fee: plan.fee,
          credit: plan.credit,
          bestDayTotal: plan.bestDayTotal,
          freeReached: plan.freeReached,
          alreadyCharged: plan.alreadyCharged,
          zeroOutAmount: plan.zeroOutAmount,
          untilFree: plan.untilFree,
        }}
        defaults={{
          buyerName: user.name,
          buyerPhone: user.phone,
          zipcode: user.zipcode ?? "",
          address: user.address ?? "",
          addressDetail: user.addressDetail ?? "",
        }}
        bankAccount={settings.bankAccount}
      />
    </div>
  );
}
