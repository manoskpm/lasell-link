"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setProductOpenAction } from "@/app/actions/products";

/// 라이브 중 상품을 손님 화면에 공개하거나 내림
export function OpenToggle({
  productId,
  isOpen,
  soldOut,
}: {
  productId: number;
  isOpen: boolean;
  soldOut?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    startTransition(async () => {
      await setProductOpenAction(productId, !isOpen);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50 ${
        isOpen
          ? "bg-zinc-200 text-zinc-700"
          : soldOut
            ? "bg-zinc-100 text-zinc-400"
            : "bg-rose-500 text-white"
      }`}
    >
      {pending ? "..." : isOpen ? "마감" : "오픈"}
    </button>
  );
}
