"use server";

import { revalidatePath } from "next/cache";
import { requireOwnShop } from "@/lib/access";
import { applyDepositMatch, candidateLabel, loadUnpaidSettlements } from "@/lib/depositMatchCore";
import { formatDate, won } from "@/lib/format";
import {
  matchTransaction,
  normalizeName,
  parseBankStatement,
  type MatchOutcome,
  type ParsedTransaction,
} from "@/lib/paymentMatch";
import { prisma } from "@/lib/prisma";

export type DepositCandidate = {
  settlementId: number;
  buyerName: string;
  amount: number;
  amountLabel: string;
  dateLabel: string;
  userId: number | null;
};

export type DepositRow = {
  key: string;
  rawLine: string;
  amountValue: number | null;
  amountLabel: string | null;
  depositorName: string | null;
  dateLabel: string | null;
  status: "confident" | "ambiguous" | "insufficient" | "none";
  note: string;
  /// status가 confident일 때 곧바로 처리할 정산들 (합산 입금이면 여러 건)
  suggestedSettlementIds: number[];
  suggestedUserId: number | null;
  suggestedCustomerName: string | null;
  candidates: DepositCandidate[];
};

export type AnalyzeResult =
  | {
      rows: DepositRow[];
      /// 직접 고를 때 쓰는 전체 미입금 정산 목록 (후보에 없을 때의 대안)
      allUnpaid: DepositCandidate[];
    }
  | { error: string };

function toDepositRow(
  index: number,
  tx: ParsedTransaction,
  outcome: MatchOutcome
): DepositRow {
  const base = {
    key: `row-${index}`,
    rawLine: tx.raw,
    amountValue: tx.amount,
    amountLabel: tx.amount != null ? won(tx.amount) : null,
    depositorName: tx.depositorName,
    dateLabel: tx.date ? formatDate(tx.date) : null,
  };

  if (outcome.type === "confident") {
    return {
      ...base,
      status: "confident",
      note: outcome.note,
      suggestedSettlementIds: outcome.settlementIds,
      suggestedUserId: outcome.userId,
      suggestedCustomerName: outcome.customerName,
      candidates: [],
    };
  }
  if (outcome.type === "ambiguous" || outcome.type === "insufficient") {
    return {
      ...base,
      status: outcome.type,
      note: outcome.note,
      suggestedSettlementIds: [],
      suggestedUserId: null,
      suggestedCustomerName: null,
      candidates: outcome.candidates.map((c) => ({
        settlementId: c.settlementId,
        buyerName: c.buyerName,
        amount: c.amount,
        amountLabel: won(c.amount),
        dateLabel: formatDate(c.createdAt),
        userId: c.userId,
      })),
    };
  }
  return {
    ...base,
    status: "none",
    note: outcome.note,
    suggestedSettlementIds: [],
    suggestedUserId: null,
    suggestedCustomerName: null,
    candidates: [],
  };
}

/// 붙여넣은 은행 거래내역 텍스트를 해석해서 미입금 정산과 맞춰봄. DB에는 아무것도 쓰지 않음
export async function analyzeDepositTextAction(
  rawText: string
): Promise<AnalyzeResult> {
  const { shop } = await requireOwnShop();

  const transactions = parseBankStatement(rawText);
  if (transactions.length === 0) {
    return { error: "붙여넣은 내용이 없어요. 은행 거래내역을 복사해서 붙여넣어주세요." };
  }

  const [unpaidSettlements, aliases] = await Promise.all([
    loadUnpaidSettlements(),
    prisma.depositorAlias.findMany({
      where: { shopId: shop.id },
      include: { user: true },
    }),
  ]);

  const aliasByName = new Map(
    aliases.map((a) => [normalizeName(a.depositorName), a.userId])
  );

  const rows = transactions.map((tx, index) => {
    const aliasUserId = tx.depositorName
      ? (aliasByName.get(normalizeName(tx.depositorName)) ?? null)
      : null;
    const outcome = matchTransaction(tx, unpaidSettlements, aliasUserId);
    return toDepositRow(index, tx, outcome);
  });

  return { rows, allUnpaid: unpaidSettlements.map(candidateLabel) };
}

/// 셀러가 화면에서 직접 확인한 뒤 "처리"를 눌렀을 때만 실행됨 (자동 처리 없음)
export async function confirmDepositMatchAction(input: {
  settlementIds: number[];
  depositorName: string | null;
  userId: number | null;
  rememberAlias: boolean;
}): Promise<{ ok: true } | { error: string }> {
  const { shop, user: operator } = await requireOwnShop();

  const result = await applyDepositMatch({
    shopId: shop.id,
    actorUserId: operator.id,
    settlementIds: input.settlementIds,
    depositorName: input.depositorName,
    userId: input.userId,
    rememberAlias: input.rememberAlias,
    auditAction: "DEPOSIT_MATCHED",
  });

  if ("ok" in result) revalidatePath("/", "layout");
  return result;
}
