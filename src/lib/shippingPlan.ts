import { Prisma } from "@/generated/prisma/client";
import { kstDateKey } from "@/lib/date";

type Client = Prisma.TransactionClient;

export type ShippingPlan = {
  /// 이번 정산에서 받을 배송비
  fee: number;
  /// 같은 날 이미 받았던 배송비 중 돌려줄 금액 (이번 정산에서 빼줌)
  credit: number;
  /// 그날 가장 많이 산 날의 누적 금액
  bestDayTotal: number;
  /// 무료배송 기준을 넘겼는지
  freeReached: boolean;
  /// 같은 날 이미 받은 배송비 합계
  alreadyCharged: number;
  /// 아직 입금 전이라 배송비를 0원으로 고쳐줄 정산 번호들
  zeroOutSettlementIds: number[];
  /// 위 정산들에서 없어지는 배송비 합계
  zeroOutAmount: number;
  /// 무료배송까지 남은 금액 (기준이 없으면 0)
  untilFree: number;
};

/// 배송비를 '그날 누적 구매액' 기준으로 계산.
/// 같은 날 이미 배송비를 냈으면 두 번 받지 않고,
/// 나중에 더 사서 무료배송 기준을 넘기면 먼저 낸 배송비를 돌려줌(차감).
export async function planShipping(
  client: Client,
  {
    userId,
    orderIds,
    shippingFee,
    freeShippingOver,
  }: {
    userId: number;
    orderIds: number[];
    shippingFee: number;
    freeShippingOver: number;
  }
): Promise<ShippingPlan> {
  const empty: ShippingPlan = {
    fee: 0,
    credit: 0,
    bestDayTotal: 0,
    freeReached: false,
    alreadyCharged: 0,
    zeroOutSettlementIds: [],
    zeroOutAmount: 0,
    untilFree: freeShippingOver,
  };

  const target = await client.order.findMany({
    where: { id: { in: orderIds }, userId, canceledAt: null },
    select: { createdAt: true },
  });
  if (target.length === 0) return empty;

  const days = [...new Set(target.map((order) => kstDateKey(order.createdAt)))];
  const ranges = days.map((day) => ({
    gte: new Date(`${day}T00:00:00+09:00`),
    lte: new Date(`${day}T23:59:59.999+09:00`),
  }));

  // 그날 산 것 전부 (이미 정산한 것 포함) — '그날 합산액'의 기준
  const dayOrders = await client.order.findMany({
    where: { userId, canceledAt: null, OR: ranges.map((createdAt) => ({ createdAt })) },
    include: { items: true },
  });

  const totals = new Map<string, number>();
  for (const order of dayOrders) {
    const key = kstDateKey(order.createdAt);
    const amount = order.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    totals.set(key, (totals.get(key) ?? 0) + amount);
  }
  const bestDayTotal = Math.max(0, ...totals.values());
  const freeReached = freeShippingOver > 0 && bestDayTotal >= freeShippingOver;

  // 같은 날 주문이 이미 묶여 있는 정산들
  const priorIds = [
    ...new Set(
      dayOrders
        .map((order) => order.settlementId)
        .filter((id): id is number => Boolean(id))
    ),
  ];
  const priors =
    priorIds.length > 0
      ? await client.settlement.findMany({
          where: { id: { in: priorIds }, canceledAt: null },
        })
      : [];

  const alreadyCharged = priors.reduce(
    (sum, prior) => sum + Math.max(0, prior.shippingFee - prior.shippingCredit),
    0
  );

  const baseFee = freeReached ? 0 : shippingFee;
  const fee = Math.max(0, baseFee - alreadyCharged);

  let credit = 0;
  let zeroOutAmount = 0;
  const zeroOutSettlementIds: number[] = [];

  if (freeReached) {
    for (const prior of priors) {
      const net = Math.max(0, prior.shippingFee - prior.shippingCredit);
      if (net <= 0) continue;
      // 이미 택배가 나간 건은 실제로 배송비가 들었으니 돌려주지 않음
      if (prior.shippingStatus === "발송완료") continue;

      if (prior.paymentStatus === "미입금") {
        zeroOutSettlementIds.push(prior.id); // 아직 안 냈으니 아예 안 받음
        zeroOutAmount += net;
      } else {
        credit += net; // 이미 낸 건 이번 정산에서 빼줌
      }
    }
  }

  return {
    fee,
    credit,
    bestDayTotal,
    freeReached,
    alreadyCharged,
    zeroOutSettlementIds,
    zeroOutAmount,
    untilFree:
      freeShippingOver > 0 ? Math.max(0, freeShippingOver - bestDayTotal) : 0,
  };
}
