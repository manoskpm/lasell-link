"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/// 목록에서 한 줄을 지우는 작은 버튼
export function RemoveButton({
  onRemove,
  confirmText,
  label = "삭제",
}: {
  onRemove: () => Promise<unknown>;
  confirmText?: string;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirmText && !confirm(confirmText)) return;
        startTransition(async () => {
          await onRemove();
          router.refresh();
        });
      }}
      className="shrink-0 text-xs text-zinc-400 underline hover:text-red-500 disabled:opacity-50"
    >
      {pending ? "..." : label}
    </button>
  );
}
