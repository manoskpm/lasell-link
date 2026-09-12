"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { FormState } from "./auth";

export async function placeOrderAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();

  const buyerName = String(formData.get("buyerName") ?? "").trim();
  const buyerPhone = String(formData.get("buyerPhone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const zipcode = String(formData.get("zipcode") ?? "").trim() || null;
  const addressDetail =
    String(formData.get("addressDetail") ?? "").trim() || null;
  const memo = String(formData.get("memo") ?? "").trim() || null;
  const paymentMethod = String(formData.get("paymentMethod") ?? "계좌이체");

  if (!buyerName || !buyerPhone || !address) {
    return { error: "받는분 이름, 연락처, 주소는 필수예요." };
  }

  let orderId: number;
  try {
    const order = await prisma.$transaction(async (tx) => {
      const cartItems = await tx.cartItem.findMany({
        where: { userId: user.id },
        include: { variant: { include: { product: true } } },
      });

      if (cartItems.length === 0) throw new Error("장바구니가 비어있어요.");

      for (const item of cartItems) {
        if (item.variant.stock < item.quantity) {
          throw new Error(`${item.variant.product.name}의 재고가 부족해요.`);
        }
      }

      const created = await tx.order.create({
        data: {
          userId: user.id,
          buyerName,
          buyerPhone,
          zipcode,
          address,
          addressDetail,
          memo,
          paymentMethod,
          items: {
            create: cartItems.map((item) => ({
              variantId: item.variantId,
              productName: item.variant.product.name,
              size: item.variant.size,
              color: item.variant.color,
              price: item.variant.product.price + item.variant.extraPrice,
              cost: item.variant.product.cost,
              quantity: item.quantity,
            })),
          },
        },
      });

      for (const item of cartItems) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      await tx.cartItem.deleteMany({ where: { userId: user.id } });

      return created;
    });
    orderId = order.id;
  } catch (error) {
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

export async function updatePaymentStatusAction(
  orderId: number,
  paymentStatus: string
) {
  await requireAdmin();
  await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus },
  });
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}

export async function updateShippingStatusAction(
  orderId: number,
  shippingStatus: string
) {
  await requireAdmin();
  await prisma.order.update({
    where: { id: orderId },
    data: { shippingStatus },
  });
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}

/// 포장 끝난 주문을 운송장번호와 함께 발송완료 처리
export async function markShippedAction(
  orderId: number,
  trackingNumber: string
) {
  await requireAdmin();

  const tracking = trackingNumber.replace(/\s/g, "");
  if (!tracking) return { error: "운송장번호를 입력해주세요." };

  await prisma.order.update({
    where: { id: orderId },
    data: {
      trackingNumber: tracking,
      shippingStatus: "발송완료",
      paymentStatus: "입금완료",
    },
  });

  revalidatePath("/admin/orders");
  revalidatePath("/admin/shipping");
  revalidatePath("/my/orders");
  return { ok: true };
}
