"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function addToCartAction(variantId: number, quantity: number) {
  const user = await requireUser();

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
  });
  if (!variant) return { error: "선택한 옵션을 찾을 수 없어요." };
  if (variant.stock <= 0) return { error: "품절된 옵션이에요." };

  const existing = await prisma.cartItem.findUnique({
    where: { userId_variantId: { userId: user.id, variantId } },
  });

  const nextQuantity = Math.min(
    (existing?.quantity ?? 0) + Math.max(1, quantity),
    variant.stock
  );

  await prisma.cartItem.upsert({
    where: { userId_variantId: { userId: user.id, variantId } },
    create: { userId: user.id, variantId, quantity: nextQuantity },
    update: { quantity: nextQuantity },
  });

  revalidatePath("/cart");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setCartQuantityAction(
  cartItemId: number,
  quantity: number
) {
  const user = await requireUser();

  const item = await prisma.cartItem.findUnique({
    where: { id: cartItemId },
    include: { variant: true },
  });
  if (!item || item.userId !== user.id) return { error: "잘못된 요청이에요." };

  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: cartItemId } });
  } else {
    await prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity: Math.min(quantity, item.variant.stock) },
    });
  }

  revalidatePath("/cart");
  revalidatePath("/", "layout");
}

export async function removeCartItemAction(cartItemId: number) {
  const user = await requireUser();
  await prisma.cartItem.deleteMany({
    where: { id: cartItemId, userId: user.id },
  });

  revalidatePath("/cart");
  revalidatePath("/", "layout");
}

export async function getCartCount(userId: number) {
  const result = await prisma.cartItem.aggregate({
    where: { userId },
    _sum: { quantity: true },
  });
  return result._sum.quantity ?? 0;
}
