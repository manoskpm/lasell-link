"use client";

import { useTransition } from "react";
import { deleteProductAction } from "@/app/actions/products";

export function DeleteProductButton({ productId }: { productId: number }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("이 상품을 삭제할까요? 지난 주문내역은 그대로 남아요.")) {
          return;
        }
        startTransition(() => deleteProductAction(productId));
      }}
      className="w-full py-3 text-sm text-red-500"
    >
      {pending ? "삭제 중..." : "상품 삭제"}
    </button>
  );
}
