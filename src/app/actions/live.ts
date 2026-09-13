"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { planShipping } from "@/lib/shippingPlan";

export type CloseBroadcastResult = {
  closedProducts: number;
  shippedCustomers: number;
  shippedOrders: number;
  /// 배송지가 없어서 넘기지 못한 손님 이름
  missingAddress: string[];
};

export type SalePreset = "midnight" | "tomorrow10" | "h3" | "h6";

const KST = 9 * 60 * 60 * 1000;

/// 마감 시각을 한국시간 기준으로 계산. 기기 시간대와 상관없이 같은 결과가 나옴
function kstDeadline(preset: SalePreset) {
  const now = Date.now();
  if (preset === "h3") return new Date(now + 3 * 60 * 60 * 1000);
  if (preset === "h6") return new Date(now + 6 * 60 * 60 * 1000);

  // 한국 벽시계 날짜를 얻기 위해 9시간을 더한 뒤 UTC 필드를 읽음
  const kst = new Date(now + KST);
  const [y, m, d] = [kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()];

  if (preset === "tomorrow10") {
    return new Date(Date.UTC(y, m, d + 1, 10, 0) - KST);
  }

  let midnight = Date.UTC(y, m, d, 23, 59) - KST;
  if (midnight <= now) midnight += 24 * 60 * 60 * 1000;
  return new Date(midnight);
}

/// 방송은 끝났지만 포장 전까지 계속 팔기. 마감 시각을 정해두면 손님 화면에 안내가 뜸
export async function startExtendedSaleAction(preset: SalePreset) {
  await requireAdmin();

  const when = kstDeadline(preset);
  if (when.getTime() <= Date.now()) {
    return { error: "마감 시각을 다시 골라주세요." };
  }

  await prisma.setting.upsert({
    where: { id: 1 },
    create: { id: 1, saleClosesAt: when },
    update: { saleClosesAt: when },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

/// 연장판매를 취소하고 평소 상태로
export async function cancelExtendedSaleAction() {
  await requireAdmin();
  await prisma.setting.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: { saleClosesAt: null },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

/// 판매를 마감하면서, 아직 배송으로 안 넘어간 구매분을 손님별로 묶어 배송 대기로 넘김.
/// 손님은 방송 중에 사기만 하면 되고, 배송 요청을 따로 누를 필요가 없음.
export async function closeBroadcastAction(): Promise<CloseBroadcastResult> {
  await requireAdmin();

  // 1) 오픈중인 상품 전부 마감
  const closed = await prisma.product.updateMany({
    where: { isOpen: true },
    data: { isOpen: false, closedAt: new Date() },
  });

  // 2) 아직 배송으로 안 넘어간 주문을 손님별로 모음
  //    (연장판매로 날짜가 넘어간 주문도 같은 묶음에 들어감)
  const orders = await prisma.order.findMany({
    where: {
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
    update: { saleClosesAt: null }, // 마감했으니 연장판매도 끝
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
