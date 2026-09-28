"use client";

import { useState, useTransition } from "react";
import { issueNotifySecretAction } from "@/app/actions/notify";

export function NotifyKeyCard({ hasKey, issuedAtLabel }: { hasKey: boolean; issuedAtLabel: string | null }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ secret: string; notifyUrl: string } | null>(null);

  function issue() {
    setError(null);
    startTransition(async () => {
      const result = await issueNotifySecretAction();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setIssued(result);
    });
  }

  return (
    <div className="card flex flex-col gap-3">
      <div>
        <h2 className="font-semibold">입금 알림 자동 확인 (베타)</h2>
        <p className="mt-1 text-sm text-zinc-500">
          은행 앱 알림(안드로이드) 또는 문자+단축어(아이폰)로 입금을 자동으로 감지해요.
          자세한 연결 방법은 전달받은 설정 안내를 따라해주세요.
        </p>
      </div>

      {!issued && (
        <p className="text-sm">
          {hasKey ? (
            <>연동키가 설정돼 있어요{issuedAtLabel ? ` (발급일: ${issuedAtLabel})` : ""}.</>
          ) : (
            "아직 연동키를 발급하지 않았어요."
          )}
        </p>
      )}

      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {issued ? (
        <div className="rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
          <p className="font-semibold">이 화면을 벗어나면 키를 다시 볼 수 없어요. 지금 앱/단축어 설정에 붙여넣어주세요.</p>
          <div className="mt-2 flex flex-col gap-1">
            <span className="text-xs text-amber-700">주소</span>
            <code className="break-all rounded-lg bg-white px-2 py-1.5 text-xs">{issued.notifyUrl}</code>
            <span className="mt-1 text-xs text-amber-700">연동키</span>
            <code className="break-all rounded-lg bg-white px-2 py-1.5 text-xs">{issued.secret}</code>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={issue}
          disabled={pending}
          className="btn-secondary self-start"
        >
          {pending ? "발급하는 중..." : hasKey ? "키 다시 발급하기 (예전 키는 바로 끊어져요)" : "연동키 발급하기"}
        </button>
      )}
    </div>
  );
}
