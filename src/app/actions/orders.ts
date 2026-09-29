"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { requireOwnShop, requireSellerConsole } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { sellingPrice } from "@/lib/price";
import { computePaymentDueAt, isPaymentOverdue } from "@/lib/paymentDue";
import { buildCustomerSettlement } from "@/lib/settlementBuilder";
import type { FormState } from "./auth";
import { storeClosedReason } from "@/lib/shop";

type Tx = Prisma.TransactionClient;

/// 재고가 충분할 때만 차감. 동시에 여러 명이 결제해도 '조건부 UPDATE' 한 방이라
/// 재고보다 많이 팔리는 일이 생기지 않음 (먼저 도착한 사람이 가져감)
async function takeStock(
  tx: Tx,
  {
    variantId,
    quantity,
    productName,
  }: { variantId: number; quantity: number; productName: string }
) {
  const result = await tx.productVariant.updateMany({
    where: { id: variantId, stock: { gte: quantity } },
    data: { stock: { decrement: quantity } },
  });
  if (result.count === 0) {
    const left = await tx.productVariant.findUnique({
      where: { id: variantId },
      select: { stock: true },
    });
    throw new Error(
      left && left.stock > 0
        ? `${productName} 재고가 ${left.stock}개 남았어요. 수량을 줄여주세요.`
        : `${productName}이(가) 방금 품절됐어요. 다른 분이 먼저 사셨어요. 장바구니에서 빼고 다른 상품을 골라주세요.`
    );
  }
}

/// 1인당 구매수량 제한 (limitPerPerson이 0이면 제한 없음)
async function assertWithinPersonLimit(
  tx: Tx,
  {
    userId,
    product,
    adding,
  }: {
    userId: number;
    product: {
      id: number;
      name: string;
      limitPerPerson: number;
      openedAt: Date | null;
    };
    adding: number;
  }
) {
  if (product.limitPerPerson <= 0) return;

  // 이번 방송에서 오픈한 뒤 산 수량만 셈 (다음 방송에 다시 올리면 한도도 새로 시작)
  const since = product.openedAt ?? undefined;

  const bought = await tx.orderItem.aggregate({
    where: {
      variant: { productId: product.id },
      order: {
        userId,
        canceledAt: null,
        ...(since ? { createdAt: { gte: since } } : {}),
      },
    },
    _sum: { quantity: true },
  });
  const already = bought._sum.quantity ?? 0;

  if (already + adding > product.limitPerPerson) {
    throw new Error(
      `${product.name}은(는) 1인당 ${product.limitPerPerson}개까지만 구매할 수 있어요.` +
        (already > 0 ? ` (이미 ${already}개 구매)` : "") +
        " 수량을 줄여주세요."
    );
  }
}

/// 장바구니를 주문으로 바꿈. 배송지는 받지 않고 '보관함'에 쌓아둔 뒤 나중에 정산으로 묶어 발송
export async function placeOrderAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();

  const closed = await storeClosedReason();
  if (closed) return { error: closed };

  const memo = String(formData.get("memo") ?? "").trim() || null;
  // 결제창 1회분 토큰. 더블클릭·새로고침으로 같은 주문이 두 번 들어오는 것을 막음
  const clientToken = String(formData.get("clientToken") ?? "").trim() || null;

  let orderId: number;
  try {
    // 이미 같은 토큰으로 들어온 주문이 있으면 그 주문을 그대로 보여줌 (중복 주문 방지)
    if (clientToken) {
      const existing = await prisma.order.findUnique({
        where: { clientToken },
        select: { id: true, userId: true },
      });
      if (existing?.userId === user.id) {
        redirect(`/my/orders/${existing.id}`);
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      const cartItems = await tx.cartItem.findMany({
        where: { userId: user.id },
        include: { variant: { include: { product: true } } },
        orderBy: { variantId: "asc" }, // 항상 같은 순서로 처리해야 동시 결제에서 엉키지 않음
      });

      if (cartItems.length === 0) throw new Error("장바구니가 비어 있어요. 사고 싶은 상품을 먼저 담아주세요.");

      // 1) 1인당 구매수량 제한 확인
      for (const item of cartItems) {
        await assertWithinPersonLimit(tx, {
          userId: user.id,
          product: item.variant.product,
          adding: item.quantity,
        });
      }

      const created = await tx.order.create({
        data: {
          userId: user.id,
          clientToken,
          buyerName: user.name,
          buyerPhone: user.phone,
          memo,
          items: {
            create: cartItems.map((item) => ({
              variantId: item.variantId,
              productName: item.variant.product.name,
              size: item.variant.size,
              color: item.variant.color,
              price:
                sellingPrice(item.variant.product) + item.variant.extraPrice,
              cost: item.variant.product.cost,
              quantity: item.quantity,
            })),
          },
        },
      });

      // 2) 재고 차감은 '남은 수량이 충분할 때만' 조건부로 — 동시에 눌러도 초과 판매되지 않음
      for (const item of cartItems) {
        await takeStock(tx, {
          variantId: item.variantId,
          quantity: item.quantity,
          productName: item.variant.product.name,
        });
      }

      await tx.cartItem.deleteMany({ where: { userId: user.id } });

      return created;
    });
    orderId = order.id;
  } catch (error) {
    unstable_rethrow(error); // redirect()가 던진 내부 에러는 그대로 통과시킴

    // 같은 토큰이 거의 동시에 두 번 들어온 경우 — 먼저 들어온 주문으로 보냄
    if (
      clientToken &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.order.findUnique({
        where: { clientToken },
        select: { id: true },
      });
      if (existing) redirect(`/my/orders/${existing.id}`);
    }
    return {
      error:
        error instanceof Error
          ? error.message
          : "주문 처리 중 문제가 생겼어요.",
    };
  }

  revalidatePath("/", "layout");
  redirect(`/my/orders/${orderId}`);
}

/// 셀러가 한 손님의 보관중인 주문을 지금 바로 배송 대기로 묶음 ("이 손님 먼저 보내기").
/// 손님은 구매만 하면 되고, 배송으로 넘기는 건 셀러가 화면에서 직접 누른다
export async function settleCustomerNowAction(
  userId: number
): Promise<{ ok: true; settlementId: number } | { error: string }> {
  const { shop } = await requireOwnShop();

  try {
    const settlementId = await prisma.$transaction(async (tx) => {
      const orders = await tx.order.findMany({
        where: { userId, settlementId: null, canceledAt: null },
        include: { items: true },
        orderBy: { createdAt: "asc" },
      });
      if (orders.length === 0) {
        throw new Error("이 손님은 보관중인 주문이 없어요. 화면을 새로고침해서 확인해주세요.");
      }

      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { pendingCoupon: true },
      });
      if (!user) throw new Error("손님 정보를 찾을 수 없어요. 화면을 새로고침해주세요.");
      if (!user.address?.trim()) {
        throw new Error(
          `${user.name}님은 배송지가 없어서 못 보내요. 손님에게 주소를 받아서 정산 화면에서 직접 넣어주세요.`
        );
      }

      return buildCustomerSettlement(tx, { shop, user, orders });
    });

    revalidatePath("/", "layout");
    return { ok: true, settlementId };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "정산 처리 중 문제가 생겼어요.",
    };
  }
}

export async function updatePaymentStatusAction(
  settlementId: number,
  paymentStatus: string
): Promise<{ ok: true } | { error: string }> {
  await requireSellerConsole();
  try {
    await prisma.settlement.update({
      where: { id: settlementId },
      data: { paymentStatus },
    });
  } catch {
    return {
      error: "저장하지 못했어요. 화면을 새로고침한 뒤 다시 시도해주세요.",
    };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateShippingStatusAction(
  settlementId: number,
  shippingStatus: string
) {
  await requireSellerConsole();
  await prisma.settlement.update({
    where: { id: settlementId },
    data: { shippingStatus },
  });
  revalidatePath("/", "layout");
}

/// 포장 끝난 정산 건을 운송장번호와 함께 발송완료 처리
export async function markShippedAction(
  settlementId: number,
  trackingNumber: string
) {
  await requireSellerConsole();

  const tracking = trackingNumber.replace(/\s/g, "");
  if (!tracking) return { error: "운송장번호를 입력해주세요." };

  await prisma.settlement.update({
    where: { id: settlementId },
    data: {
      trackingNumber: tracking,
      shippingStatus: "발송완료",
      paymentStatus: "입금완료",
    },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

/// 주문 취소. 아직 발송 전이면 재고를 원래대로 되돌림
export async function cancelOrderAction(orderId: number, reason: string) {
  await requireSellerConsole();

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true, settlement: true },
      });
      if (!order) throw new Error("주문을 찾을 수 없어요. 화면을 새로고침해주세요.");
      if (order.canceledAt) throw new Error("이미 취소된 주문이에요. 화면을 새로고침하면 반영돼요.");

      // 이미 발송된 주문은 물건이 나갔으므로 재고를 되돌리지 않음
      if (order.settlement?.shippingStatus !== "발송완료") {
        for (const item of order.items) {
          if (!item.variantId) continue;
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      await tx.order.update({
        where: { id: orderId },
        data: {
          canceledAt: new Date(),
          cancelReason: reason.trim() || null,
          settlementId: null,
        },
      });
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "취소 처리 중 문제가 생겼어요.",
    };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/// 취소한 주문을 되살림 (실수로 취소한 경우)
export async function restoreOrderAction(orderId: number) {
  await requireSellerConsole();

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (!order?.canceledAt) return;

      for (const item of order.items) {
        if (!item.variantId) continue;
        await takeStock(tx, {
          variantId: item.variantId,
          quantity: item.quantity,
          productName: item.productName,
        });
      }

      await tx.order.update({
        where: { id: orderId },
        data: { canceledAt: null, cancelReason: null },
      });
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "주문을 되살리는 중 문제가 생겼어요.",
    };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/// 정산(배송묶음) 취소. 묶인 주문들은 다시 보관함으로 돌아감
export async function cancelSettlementAction(
  settlementId: number,
  reason: string
) {
  await requireSellerConsole();

  await prisma.$transaction(async (tx) => {
    await tx.order.updateMany({
      where: { settlementId },
      data: { settlementId: null },
    });
    await tx.settlement.update({
      where: { id: settlementId },
      data: {
        canceledAt: new Date(),
        cancelReason: reason.trim() || null,
        paymentStatus: "환불완료",
      },
    });
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

/// 입금 기한이 지난 '미입금' 정산을 셀러가 확인하고 취소함 (재고는 되돌려서 다른 손님이 살 수 있게 함).
/// 자동으로 취소되지 않고, 셀러가 화면에서 직접 눌러야만 처리된다.
/// 부분입금·입금완료 건은 절대 여기로 취소할 수 없음 (실수로 돈 받은 주문이 날아가는 사고 방지).
export async function cancelOverdueSettlementAction(
  settlementId: number,
  reason: string
) {
  const { user, shop } = await requireOwnShop();

  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    return { error: "취소 사유를 적어주세요. 손님에게 그대로 보여지는 내용이에요." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const settlement = await tx.settlement.findUnique({
        where: { id: settlementId },
        include: { orders: { include: { items: true } } },
      });
      if (!settlement) {
        throw new Error("정산을 찾을 수 없어요. 화면을 새로고침해주세요.");
      }
      if (settlement.canceledAt) {
        throw new Error("이미 취소된 정산이에요. 화면을 새로고침하면 반영돼요.");
      }
      if (settlement.paymentStatus !== "미입금") {
        throw new Error(
          "부분입금됐거나 이미 입금된 건은 기한 초과로 취소할 수 없어요. 입금 상태를 확인하고 직접 처리해주세요."
        );
      }
      if (settlement.shippingStatus === "발송완료") {
        throw new Error("이미 발송된 건이라 취소할 수 없어요.");
      }
      const dueAt = computePaymentDueAt(shop, settlement.createdAt);
      if (!isPaymentOverdue(dueAt)) {
        throw new Error(
          "아직 입금 기한이 지나지 않았어요. 화면을 새로고침해서 다시 확인해주세요."
        );
      }

      for (const order of settlement.orders) {
        if (order.canceledAt) continue;
        // 아직 발송 전이므로 재고를 원래대로 되돌림
        for (const item of order.items) {
          if (!item.variantId) continue;
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        }
        await tx.order.update({
          where: { id: order.id },
          data: { canceledAt: new Date(), cancelReason: trimmedReason },
        });
      }

      await tx.settlement.update({
        where: { id: settlementId },
        data: { canceledAt: new Date(), cancelReason: trimmedReason },
      });

      await recordAudit(
        {
          actorUserId: user.id,
          action: "SETTLEMENT_OVERDUE_CANCEL",
          targetType: "Settlement",
          targetId: settlementId,
          detail: `${settlement.buyerName} · ${trimmedReason}`,
        },
        tx
      );
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "취소 처리 중 문제가 생겼어요.",
    };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/// 관리자가 손님 대신 주문을 넣어줌 (라방 댓글 '저요' 주문 대응)
export async function createOrderForCustomerAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireSellerConsole();

  const userId = Number(formData.get("userId"));
  const variantId = Number(formData.get("variantId"));
  const quantity = Math.max(1, Number(formData.get("quantity")) || 1);
  const memo = String(formData.get("memo") ?? "").trim() || null;

  if (!userId) return { error: "손님을 선택해주세요." };
  if (!variantId) return { error: "상품과 옵션을 선택해주세요." };

  try {
    await prisma.$transaction(async (tx) => {
      const [customer, variant] = await Promise.all([
        tx.user.findUnique({ where: { id: userId } }),
        tx.productVariant.findUnique({
          where: { id: variantId },
          include: { product: true },
        }),
      ]);

      if (!customer) throw new Error("고른 손님을 찾을 수 없어요. 손님을 다시 골라주세요.");
      if (!variant) throw new Error("고른 상품 옵션을 찾을 수 없어요. 상품과 옵션을 다시 골라주세요.");

      await assertWithinPersonLimit(tx, {
        userId: customer.id,
        product: variant.product,
        adding: quantity,
      });

      await tx.order.create({
        data: {
          userId: customer.id,
          buyerName: customer.name,
          buyerPhone: customer.phone,
          memo,
          items: {
            create: [
              {
                variantId: variant.id,
                productName: variant.product.name,
                size: variant.size,
                color: variant.color,
                price: sellingPrice(variant.product) + variant.extraPrice,
                cost: variant.product.cost,
                quantity,
              },
            ],
          },
        },
      });

      await takeStock(tx, {
        variantId: variant.id,
        quantity,
        productName: variant.product.name,
      });
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "주문 생성 중 문제가 생겼어요.",
    };
  }

  revalidatePath("/", "layout");
  return { error: undefined };
}
