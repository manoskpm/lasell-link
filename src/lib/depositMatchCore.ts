/// 입금 매칭 확정 로직의 공용 부분. 5단계(붙여넣기)와 6단계(알림 자동 수집)가 함께 씀.
/// "use server" 액션 파일은 async 함수만 export할 수 있어서, 라우트 핸들러에서도
/// 그대로 쓸 수 있게 일반 모듈로 분리해둠.

import { recordAudit } from "./audit";
import { formatDate, won } from "./format";
import { prisma } from "./prisma";
import type { SettlementCandidate } from "./paymentMatch";

export async function loadUnpaidSettlements(): Promise<SettlementCandidate[]> {
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

/// 방송 중인데 알림이 한참 안 들어왔으면 true (연결 끊김 의심)
export function isNotifySilent(
  shop: { notifySecretHash: string | null; lastNotifyReceivedAt: Date | null },
  isLiveNow: boolean,
  silenceHours: number
) {
  if (!shop.notifySecretHash || !isLiveNow) return false;
  if (!shop.lastNotifyReceivedAt) return true;
  return Date.now() - shop.lastNotifyReceivedAt.getTime() > silenceHours * 60 * 60 * 1000;
}

export function candidateLabel(s: SettlementCandidate) {
  return {
    settlementId: s.id,
    buyerName: s.buyerName,
    amount: s.amount,
    amountLabel: won(s.amount),
    dateLabel: formatDate(s.createdAt),
    userId: s.userId,
  };
}

/// 정산을 '입금완료'로 확정하는 실제 처리. 5단계 수동 확인과 6단계 자동 확인이 공유함.
/// actorUserId는 사람이 눌렀으면 그 사람, 자동 확정이면 상점 주인(셀러) id로 기록됨
export async function applyDepositMatch(input: {
  shopId: number;
  actorUserId: number | null;
  settlementIds: number[];
  depositorName: string | null;
  userId: number | null;
  rememberAlias: boolean;
  auditAction: "DEPOSIT_MATCHED" | "DEPOSIT_AUTO_MATCHED";
}): Promise<{ ok: true } | { error: string }> {
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
              shopId: input.shopId,
              depositorName,
            },
          },
          create: { shopId: input.shopId, depositorName, userId: input.userId },
          update: { userId: input.userId },
        });
      }

      await recordAudit(
        {
          actorUserId: input.actorUserId,
          action: input.auditAction,
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

  return { ok: true };
}
