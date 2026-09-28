"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  confirmIosBatchAction,
  dismissNotificationAction,
  markNotificationPartialAction,
  resolveNotificationAction,
  type NotificationQueueResult,
  type QueuedNotification,
} from "@/app/actions/depositNotify";
import { won } from "@/lib/format";

const STATUS_LABEL: Record<QueuedNotification["matchType"], string> = {
  CONFIDENT: "매칭됨",
  AMBIGUOUS: "확인 필요",
  INSUFFICIENT: "부분입금 의심",
  NONE: "매칭 안됨",
};

const STATUS_STYLE: Record<QueuedNotification["matchType"], string> = {
  CONFIDENT: "bg-emerald-100 text-emerald-700",
  AMBIGUOUS: "bg-amber-100 text-amber-700",
  INSUFFICIENT: "bg-red-100 text-red-700",
  NONE: "bg-zinc-100 text-zinc-500",
};

const SOURCE_LABEL: Record<string, string> = {
  ANDROID: "안드로이드 알림",
  IOS: "아이폰 문자",
};

type Choice = {
  settlementIds: number[];
  userId: number | null;
  label: string;
  amount: number;
};

function buildChoices(row: QueuedNotification, allUnpaid: NotificationQueueResult["allUnpaid"]): Choice[] {
  const choices: Choice[] = [];

  for (const c of row.candidates) {
    choices.push({
      settlementIds: [c.settlementId],
      userId: c.userId,
      amount: c.amount,
      label: `정산 #${c.settlementId} · ${c.buyerName} · ${c.amountLabel} · ${c.dateLabel}`,
    });
  }

  const shown = new Set(choices.flatMap((c) => c.settlementIds));
  for (const u of allUnpaid) {
    if (shown.has(u.settlementId)) continue;
    choices.push({
      settlementIds: [u.settlementId],
      userId: u.userId,
      amount: u.amount,
      label: `(다른 정산) #${u.settlementId} · ${u.buyerName} · ${u.amountLabel} · ${u.dateLabel}`,
    });
  }

  return choices;
}

export function NotificationQueue({ data }: { data: NotificationQueueResult }) {
  if (data.confidentIosBatch.length === 0 && data.manualQueue.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {data.confidentIosBatch.length > 0 && (
        <ConfidentBatchCard rows={data.confidentIosBatch} />
      )}
      {data.manualQueue.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-zinc-700">
            폰에서 자동으로 모인 입금 알림 {data.manualQueue.length}건 — 확인이 필요해요
          </p>
          {data.manualQueue.map((row) => (
            <ManualQueueCard key={row.id} row={row} allUnpaid={data.allUnpaid} />
          ))}
        </div>
      )}
    </div>
  );
}

function ConfidentBatchCard({ rows }: { rows: QueuedNotification[] }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirmAll() {
    setError(null);
    startTransition(async () => {
      const result = await confirmIosBatchAction(rows.map((r) => r.id));
      if ("error" in result) {
        setError(result.error);
        return;
      }
      if (result.failed > 0) {
        setError(
          `${result.succeeded}건은 처리됐고, ${result.failed}건은 이미 처리됐거나 취소돼서 건너뛰었어요. 화면을 새로고침해서 확인해주세요.`
        );
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-emerald-800">
            아이폰으로 확인된 확실한 입금 {rows.length}건
          </p>
          <p className="mt-0.5 text-xs text-emerald-700">
            문자는 발신번호를 속일 수 있어서 자동으로 처리하지 않았어요. 아래 목록을 보고 한 번에
            확인해주세요.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700"
        >
          {expanded ? "목록 접기" : "목록 보기"}
        </button>
      </div>

      {expanded && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {rows.map((row) => (
            <li key={row.id} className="rounded-xl bg-white px-3 py-2 text-sm">
              <b>{row.suggestedCustomerName ?? row.depositorName ?? "이름 없음"}</b> ·{" "}
              {row.amountLabel ?? "?"} · {row.receivedAtLabel}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-2 text-xs font-medium text-red-700">{error}</p>}

      <button
        type="button"
        onClick={confirmAll}
        disabled={pending}
        className="mt-3 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
      >
        {pending ? "처리 중..." : `확실한 입금 ${rows.length}건 — 전부 확인`}
      </button>
    </div>
  );
}

function ManualQueueCard({
  row,
  allUnpaid,
}: {
  row: QueuedNotification;
  allUnpaid: NotificationQueueResult["allUnpaid"];
}) {
  const router = useRouter();
  const choices = useMemo(() => buildChoices(row, allUnpaid), [row, allUnpaid]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [rememberAlias, setRememberAlias] = useState(true);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmShortfall, setConfirmShortfall] = useState(false);

  const selected = selectedIndex >= 0 ? choices[selectedIndex] : null;
  const canRememberAlias = Boolean(selected?.userId && row.depositorName);
  const shortfall = selected && row.amountValue != null ? selected.amount - row.amountValue : 0;

  function selectChoice(index: number) {
    setSelectedIndex(index);
    setConfirmShortfall(false);
    setError(null);
  }

  function confirm() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const result = await resolveNotificationAction({
        notificationId: row.id,
        settlementIds: selected.settlementIds,
        userId: selected.userId,
        depositorName: row.depositorName,
        rememberAlias: canRememberAlias && rememberAlias,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleConfirmClick() {
    if (!selected) return;
    if (shortfall > 0 && !confirmShortfall) {
      setConfirmShortfall(true);
      return;
    }
    confirm();
  }

  function markPartial() {
    if (!selected || selected.settlementIds.length !== 1) return;
    setError(null);
    startTransition(async () => {
      const result = await markNotificationPartialAction(row.id, selected.settlementIds[0]);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function dismiss() {
    setError(null);
    startTransition(async () => {
      const result = await dismissNotificationAction(row.id);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-xs text-zinc-400">
          {SOURCE_LABEL[row.source] ?? row.source} · {row.receivedAtLabel}
        </p>
        <span className={`chip ${STATUS_STYLE[row.matchType]}`}>{STATUS_LABEL[row.matchType]}</span>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span>
          금액 <b>{row.amountLabel ?? "?"}</b>
        </span>
        <span>
          입금자 <b>{row.depositorName ?? "?"}</b>
        </span>
      </div>

      {row.extractionInvalid && (
        <p className="mt-1.5 text-xs text-amber-600">
          알림에서 자동으로 읽은 값이 원문과 달라서 직접 확인이 필요해요.
        </p>
      )}

      {choices.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          <select
            className="input"
            value={selectedIndex}
            onChange={(event) => selectChoice(Number(event.target.value))}
          >
            <option value={-1}>정산 선택 안 함</option>
            {choices.map((choice, index) => (
              <option key={index} value={index}>
                {choice.label}
              </option>
            ))}
          </select>

          {canRememberAlias && (
            <label className="flex items-center gap-2 text-xs text-zinc-600">
              <input
                type="checkbox"
                checked={rememberAlias}
                onChange={(event) => setRememberAlias(event.target.checked)}
                className="h-4 w-4"
              />
              입금자명 &quot;{row.depositorName}&quot;을 이 손님으로 기억하기
            </label>
          )}

          {error && <p className="text-xs font-medium text-red-600">{error}</p>}

          {confirmShortfall && shortfall > 0 && (
            <div className="rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
              <p>
                정산 금액보다 <b>{won(shortfall)}</b> 모자라요. 그래도 입금완료로 처리할까요?
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setConfirmShortfall(false)}
                  className="flex-1 rounded-xl border border-amber-300 bg-white py-2 text-sm font-medium text-amber-800 disabled:opacity-40"
                >
                  아니요, 취소
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={confirm}
                  className="flex-1 rounded-xl bg-amber-600 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {pending ? "처리 중..." : "예, 그래도 입금완료 처리"}
                </button>
              </div>
            </div>
          )}

          <div className={`flex flex-wrap gap-2 ${confirmShortfall ? "hidden" : ""}`}>
            <button
              type="button"
              disabled={!selected || pending}
              onClick={handleConfirmClick}
              className="flex-1 rounded-xl bg-zinc-900 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {pending ? "처리 중..." : "확인하고 입금완료 처리"}
            </button>
            {row.matchType === "INSUFFICIENT" && (
              <button
                type="button"
                disabled={!selected || selected.settlementIds.length !== 1 || pending}
                onClick={markPartial}
                className="flex-1 rounded-xl border border-zinc-300 py-2.5 text-sm font-medium text-zinc-700 disabled:opacity-40"
              >
                부분입금으로 표시
              </button>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        disabled={pending}
        onClick={dismiss}
        className="mt-2 text-xs text-zinc-400 underline disabled:opacity-40"
      >
        관련된 정산 없음 (무시하기)
      </button>
    </div>
  );
}
