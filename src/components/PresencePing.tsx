"use client";

import { useEffect } from "react";

/// 손님 화면이 열려 있는 동안 20초마다 신호를 보내, 셀러가 실시간 접속자 수를 볼 수 있게 함
export function PresencePing() {
  useEffect(() => {
    let visitorId = "";
    try {
      visitorId = sessionStorage.getItem("lasell-visitor") ?? "";
      if (!visitorId) {
        visitorId = crypto.randomUUID();
        sessionStorage.setItem("lasell-visitor", visitorId);
      }
    } catch {
      visitorId = crypto.randomUUID(); // 저장이 막힌 브라우저면 탭마다 새로
    }

    const ping = () => {
      if (document.visibilityState === "hidden") return;
      void fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: visitorId }),
        keepalive: true,
      }).catch(() => {});
    };

    ping();
    const timer = setInterval(ping, 20_000);
    document.addEventListener("visibilitychange", ping);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", ping);
    };
  }, []);

  return null;
}
