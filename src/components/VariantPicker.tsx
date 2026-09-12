"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { addToCartAction } from "@/app/actions/cart";
import { won } from "@/lib/format";

type Variant = {
  id: number;
  size: string | null;
  color: string | null;
  stock: number;
  extraPrice: number;
};

export function VariantPicker({
  variants,
  basePrice,
}: {
  variants: Variant[];
  basePrice: number;
}) {
  const sizes = useMemo(
    () => [...new Set(variants.map((v) => v.size).filter(Boolean))] as string[],
    [variants]
  );
  const colors = useMemo(
    () => [...new Set(variants.map((v) => v.color).filter(Boolean))] as string[],
    [variants]
  );

  const [size, setSize] = useState<string | null>(
    sizes.length === 1 ? sizes[0] : null
  );
  const [color, setColor] = useState<string | null>(
    colors.length === 1 ? colors[0] : null
  );
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const needsSize = sizes.length > 0;
  const needsColor = colors.length > 0;

  const selected = variants.find(
    (v) =>
      (needsSize ? v.size === size : v.size === null) &&
      (needsColor ? v.color === color : v.color === null)
  );

  const stockOf = (predicate: (v: Variant) => boolean) =>
    variants.filter(predicate).reduce((sum, v) => sum + v.stock, 0);

  const maxQuantity = selected?.stock ?? 0;
  const unitPrice = basePrice + (selected?.extraPrice ?? 0);

  function handleAdd() {
    setMessage(null);
    if (!selected) {
      setMessage({ type: "error", text: "옵션을 선택해주세요." });
      return;
    }
    startTransition(async () => {
      const result = await addToCartAction(selected.id, quantity);
      if (result?.error) {
        setMessage({ type: "error", text: result.error });
        return;
      }
      setMessage({ type: "ok", text: "장바구니에 담았어요." });
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
              const soldOut = stockOf((v) => v.size === option) === 0;
              return (
                <button
                  key={option}
                  type="button"
                  disabled={soldOut}
                  onClick={() => {
                    setSize(option);
                    setQuantity(1);
                  }}
                  className={`min-w-14 rounded-xl border px-4 py-2.5 text-sm font-medium ${
                    size === option
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-300 bg-white text-zinc-700"
                  } ${soldOut ? "text-zinc-300 line-through" : ""}`}
                >
                  {option}
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
              const soldOut = stockOf((v) => v.color === option) === 0;
              return (
                <button
                  key={option}
                  type="button"
                  disabled={soldOut}
                  onClick={() => {
                    setColor(option);
                    setQuantity(1);
                  }}
                  className={`rounded-xl border px-4 py-2.5 text-sm font-medium ${
                    color === option
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-300 bg-white text-zinc-700"
                  } ${soldOut ? "text-zinc-300 line-through" : ""}`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <p className="label">수량</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl border border-zinc-300">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="h-11 w-11 text-xl text-zinc-600"
              aria-label="수량 줄이기"
            >
              −
            </button>
            <span className="w-10 text-center text-base font-semibold">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() =>
                setQuantity((q) =>
                  maxQuantity > 0 ? Math.min(maxQuantity, q + 1) : q + 1
                )
              }
              className="h-11 w-11 text-xl text-zinc-600"
              aria-label="수량 늘리기"
            >
              +
            </button>
          </div>
          {selected && (
            <span className="text-sm text-zinc-500">
              남은 재고 {selected.stock}개
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
        <span className="text-sm text-zinc-500">합계</span>
        <span className="text-xl font-bold">{won(unitPrice * quantity)}</span>
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
        disabled={pending || (selected ? selected.stock === 0 : false)}
        className="btn-primary"
      >
        {pending ? "담는 중..." : "장바구니 담기"}
      </button>
    </div>
  );
}
