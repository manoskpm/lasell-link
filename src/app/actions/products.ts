"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveUploadedImage } from "@/lib/upload";
import type { FormState } from "./auth";

function splitOptions(raw: string) {
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function createProductAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const price = Number(formData.get("price") ?? 0);
  const cost = Number(formData.get("cost") ?? 0);
  const category = String(formData.get("category") ?? "의류");
  const description = String(formData.get("description") ?? "").trim() || null;
  const stockPerOption = Math.max(0, Number(formData.get("stock") ?? 0));
  const sizes = splitOptions(String(formData.get("sizes") ?? ""));
  const colors = splitOptions(String(formData.get("colors") ?? ""));

  if (!name || !Number.isFinite(price) || price <= 0) {
    return { error: "상품명과 판매가를 올바르게 입력해주세요." };
  }

  const imageUrl = await saveUploadedImage(
    formData.get("image") as File | null
  );

  const sizeList: (string | null)[] = sizes.length > 0 ? sizes : [null];
  const colorList: (string | null)[] = colors.length > 0 ? colors : [null];
  const variants = sizeList.flatMap((size) =>
    colorList.map((color) => ({ size, color, stock: stockPerOption }))
  );

  await prisma.product.create({
    data: {
      name,
      price: Math.round(price),
      cost: Math.round(cost) || 0,
      category,
      description,
      imageUrl,
      variants: { create: variants },
    },
  });

  revalidatePath("/", "layout");
  redirect("/admin/products");
}

/// 라이브 방송 중 쓰는 빠른 등록. 상품명·가격·재고만 받고 목록으로 이동하지 않음
export async function quickCreateProductAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const price = Number(formData.get("price") ?? 0);
  const stock = Math.max(0, Number(formData.get("stock") ?? 0));
  const category = String(formData.get("category") ?? "의류");

  if (!name) return { error: "상품명을 입력해주세요." };
  if (!Number.isFinite(price) || price <= 0) {
    return { error: "판매가를 올바르게 입력해주세요." };
  }

  await prisma.product.create({
    data: {
      name,
      price: Math.round(price),
      category,
      variants: { create: [{ size: null, color: null, stock }] },
    },
  });

  revalidatePath("/", "layout");
  return { error: undefined };
}

export async function updateStockAction(formData: FormData) {
  await requireAdmin();

  const productId = Number(formData.get("productId"));

  const updates = [...formData.entries()]
    .filter(([key]) => key.startsWith("stock_"))
    .map(([key, value]) => ({
      variantId: Number(key.replace("stock_", "")),
      stock: Math.max(0, Number(value) || 0),
    }));

  for (const update of updates) {
    await prisma.productVariant.update({
      where: { id: update.variantId },
      data: { stock: update.stock },
    });
  }

  revalidatePath("/", "layout");
  redirect(`/admin/products/${productId}`);
}

export async function toggleProductActiveAction(
  productId: number,
  isActive: boolean
) {
  await requireAdmin();
  await prisma.product.update({
    where: { id: productId },
    data: { isActive },
  });
  revalidatePath("/", "layout");
}

export async function deleteProductAction(productId: number) {
  await requireAdmin();
  await prisma.product.delete({ where: { id: productId } });
  revalidatePath("/", "layout");
  redirect("/admin/products");
}
