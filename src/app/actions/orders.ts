"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { requireAdmin, requireUser } from "@/lib/auth";
import { applyCoupon } from "@/lib/coupon";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { sellingPrice } from "@/lib/price";
import { calcShippingFeeByDay } from "@/lib/shipping";
import type { FormState } from "./auth";

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
        : `${productName}이(가) 방금 품절됐어요. 다른 분이 먼저 결제했습니다.`
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
    product: { id: number; name: string; limitPerPerson: number };
    adding: number;
  }
) {
  if (product.limitPerPerson <= 0) return;

  const bought = await tx.orderItem.aggregate({
    where: {
      variant: { productId: product.id },
      order: { userId, canceledAt: null },
    },
    _sum: { quantity: true },
  });
  const already = bought._sum.quantity ?? 0;

  if (already + adding > product.limitPerPerson) {
    throw new Error(
      `${product.name}은(는) 1인당 ${product.limitPerPerson}개까지만 구매할 수 있어요.` +
        (already > 0 ? ` (이미 ${already}개 구매)` : "")
    );
  }
}

/// 장바구니를 주문으로 바꿈. 배송지는 받지 않고 '보관함'에 쌓아둔 뒤 나중에 정산으로 묶어 발송
export async function placeOrderAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();
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

      if (cartItems.length === 0) throw new Error("장바구니가 비어있어요.");

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

/// 보관중인 주문 여러 건을 하나로 묶어 배송 요청(정산)
export async function createSettlementAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();

  const orderIds = formData
    .getAll("orderIds")
    .map((value) => Number(value))
    .filter((value) => value > 0);

  const buyerName = String(formData.get("buyerName") ?? "").trim();
  const buyerPhone = String(formData.get("buyerPhone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const couponId = Number(formData.get("couponId")) || null;

  if (orderIds.length === 0) return { error: "정산할 주문을 선택해주세요." };
  if (!buyerName || !buyerPhone || !address) {
    return { error: "받는분 이름, 연락처, 주소는 필수예요." };
  }

  let settlementId: number;
  try {
    const settlement = await prisma.$transaction(async (tx) => {
      const orders = await tx.order.findMany({
        where: {
          id: { in: orderIds },
          userId: user.id,
          settlementId: null,
          canceledAt: null,
        },
        include: { items: true },
      });

      if (orders.length === 0) {
        throw new Error("정산할 수 있는 주문이 없어요.");
      }

      const itemsTotal = orders.reduce(
        (sum, order) =>
          sum +
          order.items.reduce((s, item) => s + item.price * item.quantity, 0),
        0
      );

      const settings = await tx.setting.upsert({
        where: { id: 1 },
        create: { id: 1 },
        update: {},
      });

      const coupon = couponId
        ? await tx.coupon.findUnique({ where: { id: couponId } })
        : null;

      // 배송비는 '그날 보관함에 쌓인 금액'으로 판정.
      // 라방에서 여러 번 나눠 사도 같은 날 합산액이 기준을 넘으면 무료배송
      const heldSameDays = await tx.order.findMany({
        where: {
          userId: user.id,
          canceledAt: null,
          OR: [{ settlementId: null }, { id: { in: orderIds } }],
        },
        include: { items: true },
      });

      const shipping = calcShippingFeeByDay({
        orders: heldSameDays,
        shippingFee: settings.shippingFee,
        freeShippingOver: settings.freeShippingOver,
      });

      const applied = applyCoupon({
        coupon,
        itemsTotal,
        shippingFee: shipping.fee,
      });

      const created = await tx.settlement.create({
        data: {
          userId: user.id,
          buyerName,
          buyerPhone,
          depositorName:
            String(formData.get("depositorName") ?? "").trim() || buyerName,
          zipcode: String(formData.get("zipcode") ?? "").trim() || null,
          address,
          addressDetail:
            String(formData.get("addressDetail") ?? "").trim() || null,
          memo: String(formData.get("memo") ?? "").trim() || null,
          paymentMethod: String(formData.get("paymentMethod") ?? "계좌이체"),
          shippingFee: applied.shippingFee,
          discount: applied.discount,
          couponId: applied.discount > 0 || coupon ? coupon?.id : null,
        },
      });

      await tx.order.updateMany({
        where: { id: { in: orders.map((order) => order.id) } },
        data: { settlementId: created.id },
      });

      return created;
    });
    settlementId = settlement.id;
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "정산 처리 중 문제가 생겼어요.",
    };
  }

  revalidatePath("/", "layout");
  redirect(`/my/settlements/${settlementId}`);
}

export async function updatePaymentStatusAction(
  settlementId: number,
  paymentStatus: string
) {
  await requireAdmin();
  await prisma.settlement.update({
    where: { id: settlementId },
    data: { paymentStatus },
  });
  revalidatePath("/", "layout");
}

export async function updateShippingStatusAction(
  settlementId: number,
  shippingStatus: string
) {
  await requireAdmin();
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
  await requireAdmin();

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
  await requireAdmin();

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true, settlement: true },
      });
      if (!order) throw new Error("주문을 찾을 수 없어요.");
      if (order.canceledAt) throw new Error("이미 취소된 주문이에요.");

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
  await requireAdmin();

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
  await requireAdmin();

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

/// 관리자가 손님 대신 주문을 넣어줌 (라방 댓글 '저요' 주문 대응)
export async function createOrderForCustomerAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

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

      if (!customer) throw new Error("손님을 찾을 수 없어요.");
      if (!variant) throw new Error("상품 옵션을 찾을 수 없어요.");

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
