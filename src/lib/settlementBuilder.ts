import type { Prisma } from "@/generated/prisma/client";
import { applyCoupon } from "./coupon";
import { planShipping } from "./shippingPlan";

type Tx = Prisma.TransactionClient;

type CustomerForSettlement = {
  id: number;
  name: string;
  phone: string;
  zipcode: string | null;
  address: string | null;
  addressDetail: string | null;
  pendingCouponId: number | null;
  pendingCoupon: {
    type: string;
    value: number;
    minAmount: number;
    isActive: boolean;
    expiresAt: Date | null;
  } | null;
};

type OrderForSettlement = {
  id: number;
  items: { price: number; quantity: number }[];
};

/// 한 손님의 보관중인 주문들을 정산(배송묶음) 하나로 묶음.
/// 방송 마감 일괄처리(closeBroadcastAction)와 셀러가 손님 한 명만 먼저 보낼 때
/// (settleCustomerNowAction) 둘 다 이 함수를 씀 — 배송비·쿠폰 계산이 항상 같은 규칙을 타게 하기 위함
export async function buildCustomerSettlement(
  tx: Tx,
  {
    shop,
    user,
    orders,
  }: {
    shop: { shippingFee: number; freeShippingOver: number };
    user: CustomerForSettlement;
    orders: OrderForSettlement[];
  }
): Promise<number> {
  const orderIds = orders.map((order) => order.id);

  const plan = await planShipping(tx, {
    userId: user.id,
    orderIds,
    shippingFee: shop.shippingFee,
    freeShippingOver: shop.freeShippingOver,
  });

  const itemsTotal = orders.reduce(
    (sum, order) =>
      sum + order.items.reduce((s, item) => s + item.price * item.quantity, 0),
    0
  );
  const applied = applyCoupon({
    coupon: user.pendingCoupon,
    itemsTotal,
    shippingFee: plan.fee,
  });

  const created = await tx.settlement.create({
    data: {
      userId: user.id,
      buyerName: user.name,
      buyerPhone: user.phone,
      depositorName: user.name,
      zipcode: user.zipcode,
      address: user.address ?? "",
      addressDetail: user.addressDetail,
      paymentMethod: "계좌이체",
      shippingFee: applied.shippingFee,
      shippingCredit: plan.credit,
      discount: applied.discount,
      couponId:
        applied.discount > 0 || applied.shippingFee !== plan.fee
          ? user.pendingCouponId
          : null,
    },
  });

  // 쓴 쿠폰은 비워서 다음 배송에 또 붙지 않게 함
  if (user.pendingCouponId) {
    await tx.user.update({
      where: { id: user.id },
      data: { pendingCouponId: null },
    });
  }

  await tx.order.updateMany({
    where: { id: { in: orderIds } },
    data: { settlementId: created.id },
  });

  if (plan.zeroOutSettlementIds.length > 0) {
    await tx.settlement.updateMany({
      where: { id: { in: plan.zeroOutSettlementIds } },
      data: { shippingFee: 0 },
    });
  }

  return created.id;
}
