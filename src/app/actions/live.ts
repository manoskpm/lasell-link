"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { kstRangeToUtc, todayKst } from "@/lib/date";
import { planShipping } from "@/lib/shippingPlan";

export type CloseBroadcastResult = {
  closedProducts: number;
  shippedCustomers: number;
  shippedOrders: number;
  /// 배송지가 없어서 넘기지 못한 손님 이름
  missingAddress: string[];
};

/// 방송을 종료하면서, 오늘 구매분을 손님별로 묶어 바로 배송 대기로 넘김.
/// 손님은 방송 중에 사기만 하면 되고, 배송 요청을 따로 누를 필요가 없음.
export async function closeBroadcastAction(): Promise<CloseBroadcastResult> {
  await requireAdmin();

  const today = todayKst();
  const todayRange = kstRangeToUtc(today, today);

  // 1) 오픈중인 상품 전부 마감
  const closed = await prisma.product.updateMany({
    where: { isOpen: true },
    data: { isOpen: false, closedAt: new Date() },
  });

  // 2) 오늘 산 것 중 아직 배송으로 안 넘어간 주문을 손님별로 모음
  const orders = await prisma.order.findMany({
    where: {
      createdAt: todayRange,
      canceledAt: null,
      settlementId: null,
      userId: { not: null },
    },
    include: { items: true, user: true },
    orderBy: { createdAt: "asc" },
  });

  const byCustomer = new Map<number, typeof orders>();
  for (const order of orders) {
    if (!order.userId) continue;
    const list = byCustomer.get(order.userId) ?? [];
    list.push(order);
    byCustomer.set(order.userId, list);
  }

  const settings = await prisma.setting.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });

  const missingAddress: string[] = [];
  let shippedCustomers = 0;
  let shippedOrders = 0;

  for (const [userId, customerOrders] of byCustomer) {
    const user = customerOrders[0].user;
    if (!user) continue;

    // 배송지가 없으면 넘기지 않고 따로 알려줌 (손님에게 주소를 받아야 함)
    if (!user.address?.trim()) {
      missingAddress.push(user.name);
      continue;
    }

    await prisma.$transaction(async (tx) => {
      const orderIds = customerOrders.map((order) => order.id);

      const plan = await planShipping(tx, {
        userId,
        orderIds,
        shippingFee: settings.shippingFee,
        freeShippingOver: settings.freeShippingOver,
      });

      const created = await tx.settlement.create({
        data: {
          userId,
          buyerName: user.name,
          buyerPhone: user.phone,
          depositorName: user.name,
          zipcode: user.zipcode,
          address: user.address ?? "",
          addressDetail: user.addressDetail,
          paymentMethod: "계좌이체",
          shippingFee: plan.fee,
          shippingCredit: plan.credit,
        },
      });

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
    });

    shippedCustomers += 1;
    shippedOrders += customerOrders.length;
  }

  revalidatePath("/", "layout");

  return {
    closedProducts: closed.count,
    shippedCustomers,
    shippedOrders,
    missingAddress,
  };
}
