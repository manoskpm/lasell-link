import { KST_OFFSET_MS } from "./date";

export type PaymentDuePolicy = {
  paymentDueRule: string; // "HOURS" | "FIXED_TIME"
  paymentDueHours: number;
  paymentDueFixedTime: string | null; // "HH:mm" (한국시간)
};

/// 정산(청구)이 생긴 시각 기준으로 입금 기한을 계산.
/// FIXED_TIME이면 그날(한국시간) 그 시각까지, 이미 지났으면 다음날 그 시각까지.
export function computePaymentDueAt(
  policy: PaymentDuePolicy,
  createdAt: Date
): Date {
  if (
    policy.paymentDueRule === "FIXED_TIME" &&
    policy.paymentDueFixedTime &&
    /^\d{2}:\d{2}$/.test(policy.paymentDueFixedTime)
  ) {
    const [hour, minute] = policy.paymentDueFixedTime.split(":").map(Number);
    const kst = new Date(createdAt.getTime() + KST_OFFSET_MS);
    const sameDayKst = Date.UTC(
      kst.getUTCFullYear(),
      kst.getUTCMonth(),
      kst.getUTCDate(),
      hour,
      minute
    );
    let dueAt = sameDayKst - KST_OFFSET_MS;
    if (dueAt <= createdAt.getTime()) dueAt += 24 * 60 * 60 * 1000;
    return new Date(dueAt);
  }

  const hours = policy.paymentDueHours > 0 ? policy.paymentDueHours : 24;
  return new Date(createdAt.getTime() + hours * 60 * 60 * 1000);
}

export function isPaymentOverdue(dueAt: Date) {
  return dueAt.getTime() < Date.now();
}
