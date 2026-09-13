type CouponLike = {
  type: string;
  value: number;
  minAmount: number;
  isActive: boolean;
  expiresAt: Date | null;
};

export function isCouponUsable(coupon: CouponLike, itemsTotal: number) {
  if (!coupon.isActive) return false;
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return false;
  return itemsTotal >= coupon.minAmount;
}

/// 쿠폰을 적용해 상품 할인액과 배송비를 계산
export function applyCoupon({
  coupon,
  itemsTotal,
  shippingFee,
}: {
  coupon: CouponLike | null;
  itemsTotal: number;
  shippingFee: number;
}) {
  if (!coupon || !isCouponUsable(coupon, itemsTotal)) {
    return { discount: 0, shippingFee };
  }

  if (coupon.type === "FREE_SHIPPING") {
    return { discount: 0, shippingFee: 0 };
  }
  if (coupon.type === "PERCENT") {
    const discount = Math.floor((itemsTotal * coupon.value) / 100);
    return { discount: Math.min(discount, itemsTotal), shippingFee };
  }
  return { discount: Math.min(coupon.value, itemsTotal), shippingFee };
}

export function couponLabel(coupon: {
  name: string;
  type: string;
  value: number;
  minAmount: number;
}) {
  const benefit =
    coupon.type === "FREE_SHIPPING"
      ? "배송비 무료"
      : coupon.type === "PERCENT"
        ? `${coupon.value}% 할인`
        : `${coupon.value.toLocaleString("ko-KR")}원 할인`;
  const condition =
    coupon.minAmount > 0
      ? ` (${coupon.minAmount.toLocaleString("ko-KR")}원 이상)`
      : "";
  return `${coupon.name} · ${benefit}${condition}`;
}
