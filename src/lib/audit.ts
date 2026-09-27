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
};

type AuditInput = {
  actorUserId: number | null;
  action: keyof typeof AUDIT_LABELS;
  targetType: "User" | "SellerApplication" | "Shop";
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
