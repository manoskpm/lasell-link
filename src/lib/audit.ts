import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "./prisma";

/// 운영 기록에 남기는 일의 종류와 화면에 보일 이름
export const AUDIT_LABELS: Record<string, string> = {
  PLATFORM_SETUP: "운영자 계정 만듦",
  SELLER_APPLY: "셀러 신청",
  SELLER_APPROVE: "셀러 승인",
  SELLER_REJECT: "셀러 거절",
  SHOP_SUSPEND: "상점 정지",
  SHOP_RESUME: "상점 재개",
  SHOP_BANK_ACCOUNT_CHANGED: "입금계좌 변경",
  PLATFORM_SETTINGS_UPDATE: "운영 방침 저장",
  SETTLEMENT_OVERDUE_CANCEL: "입금 기한 초과 취소",
  DEPOSIT_MATCHED: "거래내역으로 입금 확인",
  DEPOSIT_AUTO_MATCHED: "입금 알림으로 자동 확인",
  NOTIFY_SECRET_ISSUED: "입금 알림 연동 키 발급",
};

type AuditInput = {
  actorUserId: number | null;
  action: keyof typeof AUDIT_LABELS;
  targetType: "User" | "SellerApplication" | "Shop" | "PlatformSetting" | "Settlement";
  targetId?: number | null;
  /// 계좌번호·비밀번호 같은 민감한 값은 절대 넣지 않는다
  detail?: string | null;
};

export function recordAudit(
  input: AuditInput,
  client: Prisma.TransactionClient | typeof prisma = prisma
) {
  return client.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      detail: input.detail ?? null,
    },
  });
}
