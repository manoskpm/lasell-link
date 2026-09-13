"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { closeAllProductsAction } from "@/app/actions/products";

/// 방송 종료할 때 오픈중인 상품을 한 번에 내림
export function CloseAllButton({ count }: { count: number }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(`오픈중인 상품 ${count}개를 모두 마감할까요?`)) return;
        startTransition(async () => {
          await closeAllProductsAction();
          router.refresh();
        });
      }}
      className="chip bg-zinc-100 text-zinc-700 disabled:opacity-50"
    >
      {pending ? "마감 중..." : "방송종료 (전체 마감)"}
    </button>
  );
}
