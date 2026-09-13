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

/// 1인당 구매제한. 비우거나 0이면 제한 없음
function parseLimit(raw: FormDataEntryValue | null) {
  const value = Number(String(raw ?? "").trim());
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value);
}

/// 특가는 비워두거나 0이면 없음으로 처리
function parseSalePrice(raw: FormDataEntryValue | null, price: number) {
  const value = Number(String(raw ?? "").trim());
  if (!value || !Number.isFinite(value) || value <= 0) return null;
  if (value >= price) return null;
  return Math.round(value);
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
      salePrice: parseSalePrice(formData.get("salePrice"), Math.round(price)),
      cost: Math.round(cost) || 0,
      category,
      description,
      imageUrl,
      limitPerPerson: parseLimit(formData.get("limitPerPerson")),
      isOpen: Boolean(formData.get("openNow")),
      openedAt: formData.get("openNow") ? new Date() : null,
      variants: { create: variants },
    },
  });

  revalidatePath("/", "layout");
  redirect("/admin/products");
}

/// 등록된 상품의 정보를 수정. 사진은 새로 올릴 때만 교체
export async function updateProductAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const productId = Number(formData.get("productId"));
  const name = String(formData.get("name") ?? "").trim();
  const price = Number(formData.get("price") ?? 0);
  const cost = Number(formData.get("cost") ?? 0);

  if (!productId) return { error: "잘못된 요청이에요." };
  if (!name || !Number.isFinite(price) || price <= 0) {
    return { error: "상품명과 판매가를 올바르게 입력해주세요." };
  }

  const newImage = await saveUploadedImage(
    formData.get("image") as File | null
  );

  await prisma.product.update({
    where: { id: productId },
    data: {
      name,
      price: Math.round(price),
      salePrice: parseSalePrice(formData.get("salePrice"), Math.round(price)),
      cost: Math.round(cost) || 0,
      category: String(formData.get("category") ?? "의류"),
      description: String(formData.get("description") ?? "").trim() || null,
      limitPerPerson: parseLimit(formData.get("limitPerPerson")),
      ...(newImage ? { imageUrl: newImage } : {}),
      ...(formData.get("removeImage") ? { imageUrl: null } : {}),
    },
  });

  revalidatePath("/", "layout");
  return { error: undefined };
}

/// 상품에 옵션(사이즈/색상) 하나 추가
export async function addVariantAction(
  productId: number,
  size: string,
  color: string,
  stock: number
) {
  await requireAdmin();

  const cleanSize = size.trim() || null;
  const cleanColor = color.trim() || null;

  const exists = await prisma.productVariant.findFirst({
    where: { productId, size: cleanSize, color: cleanColor },
  });
  if (exists) return { error: "이미 있는 옵션이에요." };

  await prisma.productVariant.create({
    data: {
      productId,
      size: cleanSize,
      color: cleanColor,
      stock: Math.max(0, stock),
    },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteVariantAction(variantId: number) {
  await requireAdmin();

  const count = await prisma.productVariant.count({
    where: { product: { variants: { some: { id: variantId } } } },
  });
  if (count <= 1) {
    return { error: "옵션은 최소 1개는 있어야 해요." };
  }

  await prisma.productVariant.delete({ where: { id: variantId } });
  revalidatePath("/", "layout");
  return { ok: true };
}

/// 라이브 방송 중 쓰는 빠른 등록. 사진과 옵션은 넣어도 되고 생략해도 됨
export async function quickCreateProductAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const price = Number(formData.get("price") ?? 0);
  const stock = Math.max(0, Number(formData.get("stock") ?? 0));
  const category = String(formData.get("category") ?? "의류");
  const sizes = splitOptions(String(formData.get("sizes") ?? ""));
  const colors = splitOptions(String(formData.get("colors") ?? ""));

  if (!name) return { error: "상품명을 입력해주세요." };
  if (!Number.isFinite(price) || price <= 0) {
    return { error: "판매가를 올바르게 입력해주세요." };
  }

  const imageUrl = await saveUploadedImage(
    formData.get("image") as File | null
  );

  const sizeList: (string | null)[] = sizes.length > 0 ? sizes : [null];
  const colorList: (string | null)[] = colors.length > 0 ? colors : [null];

  await prisma.product.create({
    data: {
      name,
      price: Math.round(price),
      salePrice: parseSalePrice(formData.get("salePrice"), Math.round(price)),
      category,
      imageUrl,
      limitPerPerson: parseLimit(formData.get("limitPerPerson")),
      isOpen: true, // 방송 중 등록이라 바로 손님 화면에 뜸
      openedAt: new Date(),
      variants: {
        create: sizeList.flatMap((size) =>
          colorList.map((color) => ({ size, color, stock }))
        ),
      },
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

/// 라이브 중 상품 공개/마감. 미리 등록해둔 상품을 방송 순서대로 하나씩 오픈
export async function setProductOpenAction(productId: number, isOpen: boolean) {
  await requireAdmin();

  await prisma.product.update({
    where: { id: productId },
    data: isOpen
      ? { isOpen: true, isActive: true, openedAt: new Date(), closedAt: null }
      : { isOpen: false, closedAt: new Date() },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

/// 방송 끝나고 오픈중인 상품을 한 번에 내림
export async function closeAllProductsAction() {
  await requireAdmin();

  await prisma.product.updateMany({
    where: { isOpen: true },
    data: { isOpen: false, closedAt: new Date() },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteProductAction(productId: number) {
  await requireAdmin();
  await prisma.product.delete({ where: { id: productId } });
  revalidatePath("/", "layout");
  redirect("/admin/products");
}
