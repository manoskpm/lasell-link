"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  removeCartItemAction,
  setCartQuantityAction,
} from "@/app/actions/cart";
import { optionLabel, won } from "@/lib/format";

export function CartItemRow({
  id,
  name,
  imageUrl,
  size,
  color,
  unitPrice,
  quantity,
  stock,
}: {
  id: number;
  name: string;
  imageUrl: string | null;
  size: string | null;
  color: string | null;
  unitPrice: number;
  quantity: number;
  stock: number;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function change(next: number) {
    startTransition(async () => {
      await setCartQuantityAction(id, next);
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      await removeCartItemAction(id);
      router.refresh();
    });
  }

  return (
    <div
      className={`flex gap-3 rounded-2xl border border-zinc-200 p-3 ${
        pending ? "opacity-50" : ""
      }`}
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover"
            sizes="80px"
          />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-sm font-medium">{name}</p>
          <button
            type="button"
            onClick={remove}
            className="shrink-0 text-xs text-zinc-400"
          >
            삭제
          </button>
        </div>
        <p className="mt-0.5 text-xs text-zinc-500">
          {optionLabel(size, color)}
        </p>

        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-center rounded-lg border border-zinc-300">
            <button
              type="button"
              onClick={() => change(quantity - 1)}
              className="h-8 w-8 text-zinc-600"
              aria-label="수량 줄이기"
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-semibold">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => change(quantity + 1)}
              disabled={quantity >= stock}
              className="h-8 w-8 text-zinc-600 disabled:text-zinc-300"
              aria-label="수량 늘리기"
            >
              +
            </button>
          </div>
          <p className="text-base font-bold">{won(unitPrice * quantity)}</p>
        </div>
      </div>
    </div>
  );
}
