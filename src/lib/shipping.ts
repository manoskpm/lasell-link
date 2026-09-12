/// 상품금액에 따라 배송비를 계산. freeShippingOver가 0이면 무료배송 조건 없음
export function calcShippingFee({
  itemsTotal,
  shippingFee,
  freeShippingOver,
}: {
  itemsTotal: number;
  shippingFee: number;
  freeShippingOver: number;
}) {
  if (itemsTotal <= 0) return 0;
  if (freeShippingOver > 0 && itemsTotal >= freeShippingOver) return 0;
  return shippingFee;
}

/// 무료배송까지 얼마 남았는지 (조건이 없거나 이미 무료면 0)
export function amountUntilFreeShipping({
  itemsTotal,
  freeShippingOver,
}: {
  itemsTotal: number;
  freeShippingOver: number;
}) {
  if (freeShippingOver <= 0 || itemsTotal >= freeShippingOver) return 0;
  return freeShippingOver - itemsTotal;
}
