import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isCouponUsable } from "@/lib/coupon";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
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

  const allTotal = orders.reduce(
    (sum, order) =>
      sum + order.items.reduce((s, i) => s + i.price * i.quantity, 0),
    0
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold">정산하고 배송받기</h1>
        <p className="mt-1 text-sm text-zinc-500">
          받을 주문을 고르면 배송비가 한 번만 계산돼요.
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
