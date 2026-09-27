"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storeClosedReason } from "@/lib/shop";

export async function addToCartAction(variantId: number, quantity: number) {
  const user = await requireUser();

  const closed = await storeClosedReason();
  if (closed) return { error: closed };

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
  });
  if (!variant) return { error: "고른 옵션이 방금 바뀌었어요. 화면을 새로고침하고 다시 골라주세요." };
  if (variant.stock <= 0) return { error: "이 옵션은 방금 다 팔렸어요. 다른 색상이나 사이즈를 골라주세요." };

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
  if (!item || item.userId !== user.id) return { error: "장바구니에서 이 상품을 찾을 수 없어요. 화면을 새로고침해주세요." };

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

/// 로그인한 본인의 장바구니 수량만 센다 (다른 사람 번호를 넣어 부를 수 없게)
export async function getCartCount() {
  const user = await getCurrentUser();
  if (!user) return 0;
  const result = await prisma.cartItem.aggregate({
    where: { userId: user.id },
    _sum: { quantity: true },
  });
  return result._sum.quantity ?? 0;
}

/// 여러 옵션을 한 번에 담기 (3색 x 3사이즈처럼 조합이 많은 상품용)
export async function addManyToCartAction(
  items: { variantId: number; quantity: number }[]
) {
  const user = await requireUser();

  const closed = await storeClosedReason();
  if (closed) return { error: closed };

  const cleaned = items.filter((item) => item.variantId > 0 && item.quantity > 0);
  if (cleaned.length === 0) return { error: "담을 옵션을 골라주세요." };

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: cleaned.map((item) => item.variantId) } },
    include: { product: { select: { name: true } } },
  });

  const soldOut: string[] = [];

  for (const item of cleaned) {
    const variant = variants.find((v) => v.id === item.variantId);
    if (!variant) continue;

    if (variant.stock <= 0) {
      soldOut.push([variant.size, variant.color].filter(Boolean).join("/"));
      continue;
    }

    const existing = await prisma.cartItem.findUnique({
      where: { userId_variantId: { userId: user.id, variantId: variant.id } },
    });

    const nextQuantity = Math.min(
      (existing?.quantity ?? 0) + item.quantity,
      variant.stock
    );

    await prisma.cartItem.upsert({
      where: { userId_variantId: { userId: user.id, variantId: variant.id } },
      create: { userId: user.id, variantId: variant.id, quantity: nextQuantity },
      update: { quantity: nextQuantity },
    });
  }

  revalidatePath("/cart");
  revalidatePath("/", "layout");

  if (soldOut.length > 0) {
    return {
      ok: true,
      warning: `${soldOut.join(", ")} 옵션은 품절이라 빼고 담았어요.`,
    };
  }
  return { ok: true };
}
