"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { addManyToCartAction } from "@/app/actions/cart";
import { won } from "@/lib/format";

type Variant = {
  id: number;
  size: string | null;
  color: string | null;
  stock: number;
  extraPrice: number;
};

/// 고른 옵션 한 줄 (사이즈/색상 조합 + 수량)
type Picked = { variantId: number; quantity: number };

export function VariantPicker({
  variants,
  basePrice,
  limitPerPerson = 0,
}: {
  variants: Variant[];
  basePrice: number;
  limitPerPerson?: number;
}) {
  const sizes = useMemo(
    () => [...new Set(variants.map((v) => v.size).filter(Boolean))] as string[],
    [variants]
  );
  const colors = useMemo(
    () => [...new Set(variants.map((v) => v.color).filter(Boolean))] as string[],
    [variants]
  );

  const needsSize = sizes.length > 0;
  const needsColor = colors.length > 0;

  const [size, setSize] = useState<string | null>(
    sizes.length === 1 ? sizes[0] : null
  );
  const [color, setColor] = useState<string | null>(
    colors.length === 1 ? colors[0] : null
  );
  const [picked, setPicked] = useState<Picked[]>(() =>
    // 옵션이 아예 없는 상품은 바로 1개 담긴 상태로 시작
    !needsSize && !needsColor && variants[0]
      ? [{ variantId: variants[0].id, quantity: 1 }]
      : []
  );
  const [message, setMessage] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const findVariant = (nextSize: string | null, nextColor: string | null) =>
    variants.find(
      (v) =>
        (needsSize ? v.size === nextSize : v.size === null) &&
        (needsColor ? v.color === nextColor : v.color === null)
    );

  /// 반대쪽에서 이미 고른 값이 있으면 그 조합의 재고로, 없으면 그 줄 전체 재고로 판단
  const sizeStock = (option: string) =>
    color
      ? (findVariant(option, color)?.stock ?? 0)
      : variants
          .filter((v) => v.size === option)
          .reduce((sum, v) => sum + v.stock, 0);

  const colorStock = (option: string) =>
    size
      ? (findVariant(size, option)?.stock ?? 0)
      : variants
          .filter((v) => v.color === option)
          .reduce((sum, v) => sum + v.stock, 0);

  const selected = findVariant(size, color);
  const pickedTotal = picked.reduce((sum, item) => sum + item.quantity, 0);

  const label = (variant?: Variant) =>
    [variant?.size, variant?.color].filter(Boolean).join(" / ") || "기본";

  const priceOf = (variant?: Variant) => basePrice + (variant?.extraPrice ?? 0);

  const total = picked.reduce((sum, item) => {
    const variant = variants.find((v) => v.id === item.variantId);
    return sum + priceOf(variant) * item.quantity;
  }, 0);

  function addPick(variant: Variant) {
    setMessage(null);

    if (limitPerPerson > 0 && pickedTotal + 1 > limitPerPerson) {
      setMessage({
        type: "error",
        text: `1인당 ${limitPerPerson}개까지만 구매할 수 있어요.`,
      });
      return;
    }

    setPicked((prev) => {
      const found = prev.find((item) => item.variantId === variant.id);
      if (!found) return [...prev, { variantId: variant.id, quantity: 1 }];
      if (found.quantity >= variant.stock) {
        setMessage({
          type: "error",
          text: `${label(variant)}는 재고가 ${variant.stock}개예요.`,
        });
        return prev;
      }
      return prev.map((item) =>
        item.variantId === variant.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    });
  }

  function changeQuantity(variantId: number, diff: number) {
    const variant = variants.find((v) => v.id === variantId);
    setPicked((prev) =>
      prev.flatMap((item) => {
        if (item.variantId !== variantId) return [item];
        const next = item.quantity + diff;
        if (next <= 0) return [];
        if (variant && next > variant.stock) return [item];
        return [{ ...item, quantity: next }];
      })
    );
  }

  function handleAdd() {
    setMessage(null);
    if (picked.length === 0) {
      setMessage({ type: "error", text: "옵션을 선택해주세요." });
      return;
    }
    startTransition(async () => {
      const result = await addManyToCartAction(picked);
      if (result?.error) {
        setMessage({ type: "error", text: result.error });
        return;
      }
      setPicked([]);
      setMessage({
        type: "ok",
        text: result?.warning ?? "장바구니에 담았어요.",
      });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {needsSize && (
        <div>
          <p className="label">사이즈</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((option) => {
              const stock = sizeStock(option);
              const soldOut = stock === 0;
              return (
                <button
                  key={option}
                  type="button"
                  disabled={soldOut}
                  onClick={() => {
                    setSize(option);
                    setMessage(null);
                  }}
                  className={`min-w-14 rounded-xl border px-4 py-2.5 text-sm font-medium ${
                    size === option
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-300 bg-white text-zinc-700"
                  } ${soldOut ? "border-zinc-200 bg-zinc-50 text-zinc-300 line-through" : ""}`}
                >
                  {option}
                  {soldOut && <span className="ml-1 text-[10px]">품절</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {needsColor && (
        <div>
          <p className="label">색상</p>
          <div className="flex flex-wrap gap-2">
            {colors.map((option) => {
              const stock = colorStock(option);
              const soldOut = stock === 0;
              return (
                <button
                  key={option}
                  type="button"
                  disabled={soldOut}
                  onClick={() => {
                    setColor(option);
                    setMessage(null);
                  }}
                  className={`rounded-xl border px-4 py-2.5 text-sm font-medium ${
                    color === option
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-300 bg-white text-zinc-700"
                  } ${soldOut ? "border-zinc-200 bg-zinc-50 text-zinc-300 line-through" : ""}`}
                >
                  {option}
                  {soldOut && <span className="ml-1 text-[10px]">품절</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {(needsSize || needsColor) && (
        <>
          <p className="-mt-1 text-xs text-zinc-500">
            {selected
              ? selected.stock > 0
                ? `${label(selected)} · 남은 재고 ${selected.stock}개`
                : `${label(selected)}는 품절이에요.`
              : "사이즈와 색상을 고르면 담기 버튼이 켜져요."}
          </p>

          <button
            type="button"
            disabled={!selected || selected.stock <= 0}
            onClick={() => selected && addPick(selected)}
            className="rounded-xl border-2 border-dashed border-zinc-300 py-3 text-sm font-semibold text-zinc-700 disabled:text-zinc-300"
          >
            {selected
              ? `＋ ${label(selected)} 담기`
              : "＋ 옵션을 먼저 골라주세요"}
          </button>
          <p className="-mt-2 text-xs text-zinc-400">
            색상·사이즈를 바꿔가며 여러 조합을 담은 뒤 한 번에 주문할 수 있어요.
          </p>
        </>
      )}

      {picked.length > 0 && (
        <div className="flex flex-col gap-2 rounded-2xl bg-zinc-50 p-3">
          {picked.map((item) => {
            const variant = variants.find((v) => v.id === item.variantId);
            return (
              <div
                key={item.variantId}
                className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {label(variant)}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {won(priceOf(variant) * item.quantity)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center rounded-lg border border-zinc-300">
                  <button
                    type="button"
                    onClick={() => changeQuantity(item.variantId, -1)}
                    className="h-9 w-9 text-lg text-zinc-600"
                    aria-label="수량 줄이기"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => changeQuantity(item.variantId, 1)}
                    className="h-9 w-9 text-lg text-zinc-600"
                    aria-label="수량 늘리기"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
        <span className="text-sm text-zinc-500">
          합계 {pickedTotal > 0 ? `(${pickedTotal}개)` : ""}
        </span>
        <span className="text-xl font-bold">{won(total)}</span>
      </div>

      {message && (
        <div
          className={`flex items-center justify-between rounded-xl px-3.5 py-3 text-sm ${
            message.type === "ok"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-600"
          }`}
        >
          <span>{message.text}</span>
          {message.type === "ok" && (
            <Link href="/cart" className="font-semibold underline">
              장바구니 보기
            </Link>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleAdd}
        disabled={pending || picked.length === 0}
        className="btn-primary"
      >
        {pending
          ? "담는 중..."
          : picked.length > 1
            ? `${picked.length}개 옵션 장바구니 담기`
            : "장바구니 담기"}
      </button>
    </div>
  );
}
