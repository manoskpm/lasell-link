"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/// 라이브 화면을 몇 초마다 새로고침해서 재고·주문을 실시간에 가깝게 보여줌
export function AutoRefresh({ seconds = 5 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);

  return null;
}
