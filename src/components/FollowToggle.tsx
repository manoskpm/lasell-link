"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toggleFollowAction } from "@/app/actions/customers";

/// 손님을 단골로 등록/해제하는 버튼
export function FollowToggle({
  userId,
  followed,
}: {
  userId: number;
  followed: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await toggleFollowAction(userId, !followed);
          router.refresh();
        })
      }
      className={`chip shrink-0 ${
        followed
          ? "bg-amber-100 text-amber-700"
          : "bg-zinc-100 text-zinc-500"
      }`}
    >
      {followed ? "⭐ 단골" : "단골 등록"}
    </button>
  );
}
