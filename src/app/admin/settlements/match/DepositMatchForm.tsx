"use client";

import { useMemo, useState, useTransition } from "react";
import { updatePaymentStatusAction } from "@/app/actions/orders";
import {
  analyzeDepositTextAction,
  confirmDepositMatchAction,
  type AnalyzeResult,
  type DepositCandidate,
  type DepositRow,
} from "@/app/actions/paymentMatch";
import { won } from "@/lib/format";

const STATUS_LABEL: Record<DepositRow["status"], string> = {
  confident: "매칭됨",
  ambiguous: "확인 필요",
  insufficient: "부분입금 의심",
  none: "매칭 안됨",
};

const STATUS_STYLE: Record<DepositRow["status"], string> = {
  confident: "bg-emerald-100 text-emerald-700",
  ambiguous: "bg-amber-100 text-amber-700",
  insufficient: "bg-red-100 text-red-700",
  none: "bg-zinc-100 text-zinc-500",
};

type Choice = {
  settlementIds: number[];
  userId: number | null;
  label: string;
  /// 선택한 정산(들)의 합계 금액 — 부분입금 모자란 금액 계산에 씀
  amount: number;
};

const EXAMPLE = `2026-09-28 14:32  입금  23,000  김영희
2026-09-28 09:10  이체  19,000  박민수`;

export function DepositMatchForm() {
  const [text, setText] = useState("");
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAnalyze() {
    setAnalyzeError(null);
    startTransition(async () => {
      const result = await analyzeDepositTextAction(text);
      if ("error" in result) {
        setAnalyzeError(result.error);
        setAnalysis(null);
        return;
      }
      setAnalysis(result);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-col gap-3">
        <div>
          <label className="label" htmlFor="bankText">
            은행 거래내역 붙여넣기
          </label>
          <textarea
            id="bankText"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={6}
            className="input resize-none font-mono text-xs"
            placeholder={`예)\n${EXAMPLE}`}
          />
          <p className="mt-1 text-xs text-zinc-500">
            한 줄에 날짜, 입금액, 보낸사람 이름이 들어있으면 돼요. 표 형태로 복사해도
            괜찮아요.
          </p>
        </div>

        {analyzeError && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
            {analyzeError}
          </p>
        )}

        <button
          type="button"
          onClick={handleAnalyze}
          disabled={pending || !text.trim()}
          className="btn-primary"
        >
          {pending ? "확인하는 중..." : "거래내역 확인하기"}
        </button>
      </div>

      {analysis && "rows" in analysis && (
        <ResultList rows={analysis.rows} allUnpaid={analysis.allUnpaid} />
      )}
    </div>
  );
}

function ResultList({
  rows,
  allUnpaid,
}: {
  rows: DepositRow[];
  allUnpaid: DepositCandidate[];
}) {
  const confidentCount = rows.filter((r) => r.status === "confident").length;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-zinc-500">
        {rows.length}줄 중 <b className="text-emerald-600">매칭됨 {confidentCount}건</b>
        , 확인 필요{" "}
        {rows.filter((r) => r.status === "ambiguous" || r.status === "insufficient").length}
        건
      </p>
      {rows.map((row) => (
        <DepositRowCard key={row.key} row={row} allUnpaid={allUnpaid} />
      ))}
    </div>
  );
}

function buildChoices(row: DepositRow, allUnpaid: DepositRow["candidates"]): Choice[] {
  const choices: Choice[] = [];

  if (row.status === "confident" && row.suggestedSettlementIds.length > 0) {
    // 확실한 매칭은 부분입금 확인 흐름을 타지 않으므로 금액은 거래금액으로 채워둠(미사용)
    choices.push({
      settlementIds: row.suggestedSettlementIds,
      userId: row.suggestedUserId,
      amount: row.amountValue ?? 0,
      label:
        row.suggestedSettlementIds.length > 1
          ? `추천 · 정산 #${row.suggestedSettlementIds.join(", #")} 합계 처리 — ${row.suggestedCustomerName}`
          : `추천 · 정산 #${row.suggestedSettlementIds[0]} — ${row.suggestedCustomerName}`,
    });
  }

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

function DepositRowCard({
  row,
  allUnpaid,
}: {
  row: DepositRow;
  allUnpaid: DepositRow["candidates"];
}) {
  const choices = useMemo(() => buildChoices(row, allUnpaid), [row, allUnpaid]);
  const defaultIndex = row.status === "confident" && row.suggestedSettlementIds.length > 0 ? 0 : -1;

  const [selectedIndex, setSelectedIndex] = useState(defaultIndex);
  const [rememberAlias, setRememberAlias] = useState(true);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [confirmShortfall, setConfirmShortfall] = useState(false);

  const selected = selectedIndex >= 0 ? choices[selectedIndex] : null;
  const canRememberAlias = Boolean(selected?.userId && row.depositorName);
  const shortfall =
    selected && row.amountValue != null ? selected.amount - row.amountValue : 0;

  function selectChoice(index: number) {
    setSelectedIndex(index);
    setConfirmShortfall(false);
    setError(null);
  }

  function confirm() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const result = await confirmDepositMatchAction({
        settlementIds: selected.settlementIds,
        depositorName: row.depositorName,
        userId: selected.userId,
        rememberAlias: canRememberAlias && rememberAlias,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setDone(true);
    });
  }

  // 고른 정산이 입금액보다 크면(모자라면) 모자란 금액을 한 번 더 보여주고
  // 확인받은 뒤에만 처리함 — '부분입금 의심' 줄이 아니어도 직접 고른 정산이
  // 모자랄 수 있어서 항상 검사함
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
      const result = await updatePaymentStatusAction(
        selected.settlementIds[0],
        "부분입금"
      );
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      setDone(true);
    });
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        처리했어요. ({row.rawLine})
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-mono text-xs text-zinc-400">{row.rawLine}</p>
        <span className={`chip ${STATUS_STYLE[row.status]}`}>{STATUS_LABEL[row.status]}</span>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span>
          금액 <b>{row.amountLabel ?? "?"}</b>
        </span>
        <span>
          입금자 <b>{row.depositorName ?? "?"}</b>
        </span>
        {row.dateLabel && <span className="text-zinc-500">{row.dateLabel}</span>}
      </div>

      <p className="mt-1.5 text-xs text-zinc-500">{row.note}</p>

      {row.amountLabel && choices.length > 0 && (
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
              입금자명 &quot;{row.depositorName}&quot;을 이 손님으로 기억하기 (다음부터 자동
              매칭돼요)
            </label>
          )}

          {error && <p className="text-xs font-medium text-red-600">{error}</p>}

          {confirmShortfall && shortfall > 0 && (
            <div className="rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
              <p>
                정산 금액보다 <b>{won(shortfall)}</b> 모자라요. 그래도 입금완료로
                처리할까요?
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

          <div className={`flex gap-2 ${confirmShortfall ? "hidden" : ""}`}>
            <button
              type="button"
              disabled={!selected || pending}
              onClick={handleConfirmClick}
              className="flex-1 rounded-xl bg-zinc-900 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {pending ? "처리 중..." : "확인하고 입금완료 처리"}
            </button>
            {row.status === "insufficient" && (
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
    </div>
  );
}
