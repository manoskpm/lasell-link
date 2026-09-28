"use server";

import { revalidatePath } from "next/cache";
import { requireOwnShop } from "@/lib/access";
import { recordAudit } from "@/lib/audit";
import { formatDate, won } from "@/lib/format";
import {
  matchTransaction,
  normalizeName,
  parseBankStatement,
  type MatchOutcome,
  type ParsedTransaction,
  type SettlementCandidate,
} from "@/lib/paymentMatch";
import { prisma } from "@/lib/prisma";

export type DepositCandidate = {
  settlementId: number;
  buyerName: string;
  amountLabel: string;
  dateLabel: string;
  userId: number | null;
};

export type DepositRow = {
  key: string;
  rawLine: string;
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

async function loadUnpaidSettlements(): Promise<SettlementCandidate[]> {
  const settlements = await prisma.settlement.findMany({
    where: { paymentStatus: "미입금", canceledAt: null },
    include: { orders: { include: { items: true } }, user: true },
    orderBy: { createdAt: "asc" },
  });
  return settlements.map((s) => {
    const itemsTotal = s.orders.reduce(
      (sum, order) =>
        sum + order.items.reduce((x, item) => x + item.price * item.quantity, 0),
      0
    );
    return {
      id: s.id,
      userId: s.userId,
      buyerName: s.buyerName,
      depositorName: s.depositorName,
      accountName: s.user?.name ?? null,
      amount: itemsTotal + s.shippingFee - s.shippingCredit - s.discount,
      createdAt: s.createdAt,
    };
  });
}

function toCandidateLabel(s: SettlementCandidate): DepositCandidate {
  return {
    settlementId: s.id,
    buyerName: s.buyerName,
    amountLabel: won(s.amount),
    dateLabel: formatDate(s.createdAt),
    userId: s.userId,
  };
}

function toDepositRow(
  index: number,
  tx: ParsedTransaction,
  outcome: MatchOutcome
): DepositRow {
  const base = {
    key: `row-${index}`,
    rawLine: tx.raw,
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

  return { rows, allUnpaid: unpaidSettlements.map(toCandidateLabel) };
}

/// 셀러가 화면에서 직접 확인한 뒤 "처리"를 눌렀을 때만 실행됨 (자동 처리 없음)
export async function confirmDepositMatchAction(input: {
  settlementIds: number[];
  depositorName: string | null;
  userId: number | null;
  rememberAlias: boolean;
}): Promise<{ ok: true } | { error: string }> {
  const { shop, user: operator } = await requireOwnShop();

  if (input.settlementIds.length === 0) {
    return { error: "처리할 정산을 먼저 골라주세요." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const settlements = await tx.settlement.findMany({
        where: { id: { in: input.settlementIds } },
      });
      if (settlements.length !== input.settlementIds.length) {
        throw new Error("정산 일부를 찾을 수 없어요. 화면을 새로고침해주세요.");
      }
      // 부분입금·이미입금완료·취소된 건이 섞여 있으면 전체를 막음 — 실수로 상태를 덮어쓰지 않기 위함
      const notReady = settlements.find(
        (s) => s.canceledAt || s.paymentStatus !== "미입금"
      );
      if (notReady) {
        throw new Error(
          `정산 #${notReady.id}은(는) 이미 처리됐거나 취소된 건이에요. 화면을 새로고침해서 다시 확인해주세요.`
        );
      }

      await tx.settlement.updateMany({
        where: { id: { in: input.settlementIds } },
        data: { paymentStatus: "입금완료" },
      });

      const depositorName = input.depositorName?.trim();
      if (input.rememberAlias && input.userId && depositorName) {
        await tx.depositorAlias.upsert({
          where: {
            shopId_depositorName: {
              shopId: shop.id,
              depositorName,
            },
          },
          create: { shopId: shop.id, depositorName, userId: input.userId },
          update: { userId: input.userId },
        });
      }

      await recordAudit(
        {
          actorUserId: operator.id,
          action: "DEPOSIT_MATCHED",
          targetType: "Settlement",
          targetId: input.settlementIds[0],
          detail: `정산 #${input.settlementIds.join(", #")} · 입금자 ${depositorName || "확인됨"}`,
        },
        tx
      );
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "처리 중 문제가 생겼어요.",
    };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
