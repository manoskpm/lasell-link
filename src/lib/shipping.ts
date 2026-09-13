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

type DayOrder = {
  createdAt: Date;
  items: { price: number; quantity: number }[];
};

/// 주문들을 한국 날짜별로 묶어 그날 합산액을 구함
export function dayTotals(orders: DayOrder[]) {
  const totals = new Map<string, number>();
  for (const order of orders) {
    const key = new Date(order.createdAt.getTime() + 9 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const amount = order.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    totals.set(key, (totals.get(key) ?? 0) + amount);
  }
  return totals;
}

/// 하루라도 무료배송 기준을 넘긴 날이 있으면 배송비 0원.
/// (라방은 하루에 여러 번 나눠 사기 때문에 '그날 합산액'으로 판단)
export function calcShippingFeeByDay({
  orders,
  shippingFee,
  freeShippingOver,
}: {
  orders: DayOrder[];
  shippingFee: number;
  freeShippingOver: number;
}) {
  const totals = [...dayTotals(orders).values()];
  const itemsTotal = totals.reduce((sum, value) => sum + value, 0);
  if (itemsTotal <= 0) return { fee: 0, bestDayTotal: 0, itemsTotal: 0 };

  const bestDayTotal = Math.max(...totals);
  const free = freeShippingOver > 0 && bestDayTotal >= freeShippingOver;
  return { fee: free ? 0 : shippingFee, bestDayTotal, itemsTotal };
}
