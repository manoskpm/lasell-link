"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toggleProductActiveAction } from "@/app/actions/products";

export function ToggleActive({
  productId,
  isActive,
}: {
  productId: number;
  isActive: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await toggleProductActiveAction(productId, !isActive);
          router.refresh();
        })
      }
      className={`chip ${
        isActive ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"
      }`}
    >
      {isActive ? "판매중" : "숨김"}
    </button>
  );
}
