import { prisma } from "./prisma";

/// 손님 화면에 보이는 상점 원본 레코드.
/// 지금은 상점을 1개만 운영하므로 가장 먼저 만든 상점이다.
/// 여러 상점으로 넓힐 때는 이 함수만 "주소(/s/상점주소)로 상점 찾기"로 바꾸면 된다.
export function getStorefrontShop() {
  return prisma.shop.findFirst({
    orderBy: { id: "asc" },
    include: { courier: true },
  });
}

/// 손님이 지금 새로 담거나 살 수 있는지.
/// 안 되면 손님에게 그대로 보여줄 문장을, 되면 null 을 돌려준다.
export async function storeClosedReason(): Promise<string | null> {
  const shop = await getStorefrontShop();
  if (!shop) {
    return "아직 문을 연 상점이 없어요. 상점이 문을 열면 바로 살 수 있어요.";
  }
  if (shop.status !== "ACTIVE") {
    return "지금은 상점이 잠시 쉬고 있어요. 다시 문을 열면 살 수 있어요.";
  }
  return null;
}

/// 손님 화면에서 쓰는 상점 정보만 뽑아낸 값.
/// 상점이 아직 하나도 없을 때(맨 처음 배포 직후)도 화면이 죽지 않도록
/// 안전한 기본값을 채워서 돌려준다.
export type StorefrontSettings = {
  name: string;
  logoUrl: string | null;
  kakaoChannelUrl: string | null;
  chatUrl: string | null;
  bankAccount: string | null;
  bankAccountChangedAt: Date | null;
  noticeText: string | null;
  saleClosesAt: Date | null;
  lowStockAt: number;
  shippingFee: number;
  freeShippingOver: number;
  courierName: string | null;
  trackingUrlTemplate: string | null;
  paymentDueRule: string;
  paymentDueHours: number;
  paymentDueFixedTime: string | null;
};

const FALLBACK_STOREFRONT_SETTINGS: StorefrontSettings = {
  name: "내 상점",
  logoUrl: null,
  kakaoChannelUrl: null,
  chatUrl: null,
  bankAccount: null,
  bankAccountChangedAt: null,
  noticeText: null,
  saleClosesAt: null,
  lowStockAt: 3,
  shippingFee: 3000,
  freeShippingOver: 0,
  courierName: null,
  trackingUrlTemplate: null,
  paymentDueRule: "HOURS",
  paymentDueHours: 24,
  paymentDueFixedTime: null,
};

export async function getStorefrontSettings(): Promise<StorefrontSettings> {
  const shop = await getStorefrontShop();
  if (!shop) return FALLBACK_STOREFRONT_SETTINGS;
  return {
    name: shop.name,
    logoUrl: shop.logoUrl,
    kakaoChannelUrl: shop.kakaoChannelUrl,
    chatUrl: shop.chatUrl,
    bankAccount: shop.bankAccount,
    bankAccountChangedAt: shop.bankAccountChangedAt,
    noticeText: shop.noticeText,
    saleClosesAt: shop.saleClosesAt,
    lowStockAt: shop.lowStockAt,
    shippingFee: shop.shippingFee,
    freeShippingOver: shop.freeShippingOver,
    courierName: shop.courier?.name ?? null,
    trackingUrlTemplate: shop.courier?.trackingUrlTemplate ?? null,
    paymentDueRule: shop.paymentDueRule,
    paymentDueHours: shop.paymentDueHours,
    paymentDueFixedTime: shop.paymentDueFixedTime,
  };
}

/// 계좌를 바꾼 지 24시간이 안 지났으면 true (손님 화면에 안내를 보여줄지 판단용)
export function bankAccountRecentlyChanged(changedAt: Date | null) {
  if (!changedAt) return false;
  return Date.now() - changedAt.getTime() < 24 * 60 * 60 * 1000;
}

/// 계좌번호 화면 표시용: 뒤 4자리만 남기고 가림 (예: 3333-**-***4567)
export function maskBankAccount(raw: string) {
  const digitGroups = raw.match(/\d+/g);
  if (!digitGroups || digitGroups.length === 0) return raw;
  const last = digitGroups[digitGroups.length - 1];
  if (last.length <= 4) return raw;
  const visible = last.slice(-4);
  const masked = "*".repeat(last.length - 4) + visible;
  return raw.slice(0, raw.lastIndexOf(last)) + masked;
}

/// 입금 알림 원문을 저장하기 전에 계좌번호로 보이는 긴 숫자를 가림.
/// 입금액은 보통 100만원 미만(6자리 이하)이라 7자리 이상만 가리면 계좌번호는 가리고
/// 금액은 그대로 남길 수 있음 (계좌번호는 보통 11~14자리)
export function maskLongDigitRuns(text: string) {
  return text.replace(/[\d-]{7,}/g, (match) => {
    const digits = match.replace(/-/g, "");
    if (digits.length < 7) return match;
    const visible = digits.slice(-4);
    return "*".repeat(digits.length - 4) + visible;
  });
}
