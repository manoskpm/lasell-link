"use server";

import { revalidatePath } from "next/cache";
import { requireOwnShop } from "@/lib/access";
import { applyDepositMatch, candidateLabel, loadUnpaidSettlements } from "@/lib/depositMatchCore";
import { formatDate, won } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { DepositCandidate } from "./paymentMatch";

export type QueuedNotification = {
  id: number;
  source: string;
  receivedAtLabel: string;
  amountValue: number | null;
  amountLabel: string | null;
  depositorName: string | null;
  matchType: "CONFIDENT" | "AMBIGUOUS" | "INSUFFICIENT" | "NONE";
  extractionInvalid: boolean;
  suggestedSettlementIds: number[];
  suggestedUserId: number | null;
  suggestedCustomerName: string | null;
  candidates: DepositCandidate[];
};

export type NotificationQueueResult = {
  /// 아이폰에서 온, 확실히 매칭된 건들 — 자동 확정하지 않고 여기 모아뒀다가
  /// 셀러가 한 번에 확인해야 함 (문자 발신번호 위조 위험 때문)
  confidentIosBatch: QueuedNotification[];
  /// 그 외(애매함·부분입금 의심·매칭 안됨, 또는 안드로이드인데 확실하지 않았던 것) — 한 건씩 확인
  manualQueue: QueuedNotification[];
  allUnpaid: DepositCandidate[];
};

function parseIds(json: string): number[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.filter((n): n is number => typeof n === "number") : [];
  } catch {
    return [];
  }
}

/// 셀러 화면(입금 확인)에 보여줄 대기중인 알림 목록
export async function listNotificationQueueAction(): Promise<NotificationQueueResult> {
  const { shop } = await requireOwnShop();

  const [rows, unpaidSettlements] = await Promise.all([
    prisma.depositNotification.findMany({
      where: { shopId: shop.id, status: "PENDING" },
      orderBy: { createdAt: "asc" },
    }),
    loadUnpaidSettlements(),
  ]);

  const byId = new Map(unpaidSettlements.map((s) => [s.id, s]));

  const queued = rows.map((row): QueuedNotification => {
    const ids = parseIds(row.settlementIds);
    const candidates = ids
      .map((id) => byId.get(id))
      .filter((s): s is (typeof unpaidSettlements)[number] => Boolean(s))
      .map(candidateLabel);

    return {
      id: row.id,
      source: row.source,
      receivedAtLabel: formatDate(row.receivedAt),
      amountValue: row.extractedAmount,
      amountLabel: row.extractedAmount != null ? won(row.extractedAmount) : null,
      depositorName: row.extractedName,
      matchType: row.matchType as QueuedNotification["matchType"],
      extractionInvalid: row.extractionInvalid,
      suggestedSettlementIds: row.matchType === "CONFIDENT" ? ids : [],
      suggestedUserId: row.matchedUserId,
      suggestedCustomerName: row.matchedCustomerName,
      candidates,
    };
  });

  return {
    confidentIosBatch: queued.filter((q) => q.source === "IOS" && q.matchType === "CONFIDENT"),
    manualQueue: queued.filter((q) => !(q.source === "IOS" && q.matchType === "CONFIDENT")),
    allUnpaid: unpaidSettlements.map(candidateLabel),
  };
}

/// 아이폰에서 온 "확실한 입금" 묶음을 한 번에 확정. 셀러가 이름·금액 목록을 보고
/// 직접 누른 뒤에만 실행됨 — 자동 확정이 아니라 "일괄 확인"임
export async function confirmIosBatchAction(
  notificationIds: number[]
): Promise<{ ok: true; succeeded: number; failed: number } | { error: string }> {
  const { shop, user: operator } = await requireOwnShop();

  if (notificationIds.length === 0) {
    return { error: "확인할 입금이 없어요." };
  }

  const rows = await prisma.depositNotification.findMany({
    where: {
      id: { in: notificationIds },
      shopId: shop.id,
      status: "PENDING",
      source: "IOS",
      matchType: "CONFIDENT",
    },
  });

  let succeeded = 0;
  let failed = 0;
  for (const row of rows) {
    const result = await applyDepositMatch({
      shopId: shop.id,
      actorUserId: operator.id,
      settlementIds: parseIds(row.settlementIds),
      depositorName: row.extractedName,
      userId: row.matchedUserId,
      rememberAlias: true,
      auditAction: "DEPOSIT_MATCHED",
    });
    if ("ok" in result) {
      succeeded++;
      await prisma.depositNotification.update({
        where: { id: row.id },
        data: { status: "RESOLVED" },
      });
    } else {
      failed++;
    }
  }

  revalidatePath("/", "layout");
  return { ok: true, succeeded, failed };
}

/// 대기 목록 한 건을 셀러가 직접 골라서 입금완료 처리
export async function resolveNotificationAction(input: {
  notificationId: number;
  settlementIds: number[];
  userId: number | null;
  depositorName: string | null;
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

  if ("ok" in result) {
    await prisma.depositNotification
      .update({ where: { id: input.notificationId }, data: { status: "RESOLVED" } })
      .catch(() => {});
    revalidatePath("/", "layout");
  }
  return result;
}

/// 대기 목록 한 건을 "부분입금"으로 표시
export async function markNotificationPartialAction(
  notificationId: number,
  settlementId: number
): Promise<{ ok: true } | { error: string }> {
  await requireOwnShop();

  try {
    await prisma.settlement.update({
      where: { id: settlementId },
      data: { paymentStatus: "부분입금" },
    });
  } catch {
    return { error: "저장하지 못했어요. 화면을 새로고침한 뒤 다시 시도해주세요." };
  }

  await prisma.depositNotification
    .update({ where: { id: notificationId }, data: { status: "RESOLVED" } })
    .catch(() => {});
  revalidatePath("/", "layout");
  return { ok: true };
}

/// 관련된 정산이 없어서 무시하는 경우 (예: 다른 목적의 입금, 잘못 읽힌 알림)
export async function dismissNotificationAction(
  notificationId: number
): Promise<{ ok: true } | { error: string }> {
  const { shop } = await requireOwnShop();

  await prisma.depositNotification.updateMany({
    where: { id: notificationId, shopId: shop.id },
    data: { status: "DISMISSED" },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
