import { prisma } from "@/lib/prisma";

/// 한국 기준 월(YYYY-MM)의 시작과 끝을 UTC 구간으로
export function kstMonthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  return {
    gte: new Date(`${month}-01T00:00:00+09:00`),
    lt: new Date(
      `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01T00:00:00+09:00`
    ),
  };
}

export function kstMonthKey(date: Date) {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 7);
}

export function shiftMonth(month: string, diff: number) {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + diff;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

export type MonthlySummary = {
  month: string;
  /// 수입
  productSales: number;
  shippingIncome: number;
  income: number;
  /// 지출
  goodsCost: number;
  courierCost: number;
  fixedCost: number;
  otherExpense: number;
  discount: number;
  expense: number;
  /// 결과
  profit: number;
  orderCount: number;
  shipmentCount: number;
};

/// 한 달치 손익을 계산. 매출·원가·택배비는 주문에서 자동으로 잡고,
/// 고정비와 기타 지출만 셀러가 적은 값을 쓴다
export async function monthlySummary(month: string): Promise<MonthlySummary> {
  const range = kstMonthRange(month);

  const [orders, settlements, settings, expenses, fixedCosts] =
    await Promise.all([
      prisma.order.findMany({
        where: { canceledAt: null, createdAt: range },
        include: { items: true },
      }),
      prisma.settlement.findMany({
        where: { canceledAt: null, createdAt: range },
        select: { shippingFee: true, shippingCredit: true, discount: true },
      }),
      prisma.setting.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} }),
      prisma.expense.findMany({ where: { spentAt: range } }),
      // 그달에 실제로 돌아가고 있던 고정비만 (시작 전 · 끝난 뒤 달은 빼고)
      prisma.fixedCost.findMany({
        where: {
          startedAt: { lt: range.lt },
          OR: [{ endedAt: null }, { endedAt: { gte: range.gte } }],
        },
      }),
    ]);

  const items = orders.flatMap((order) => order.items);
  const productSales = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const goodsCost = items.reduce(
    (sum, item) => sum + item.cost * item.quantity,
    0
  );

  const shippingIncome = settlements.reduce(
    (sum, s) => sum + s.shippingFee - s.shippingCredit,
    0
  );
  const discount = settlements.reduce((sum, s) => sum + s.discount, 0);

  // 무료배송이어도 택배사에는 건당 비용이 나감
  const shipmentCount = settlements.length;
  const courierCost = shipmentCount * settings.courierCost;

  const otherExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const fixedCost = fixedCosts.reduce((sum, f) => sum + f.amount, 0);

  const income = productSales + shippingIncome;
  const expense = goodsCost + courierCost + fixedCost + otherExpense + discount;

  return {
    month,
    productSales,
    shippingIncome,
    income,
    goodsCost,
    courierCost,
    fixedCost,
    otherExpense,
    discount,
    expense,
    profit: income - expense,
    orderCount: orders.length,
    shipmentCount,
  };
}
