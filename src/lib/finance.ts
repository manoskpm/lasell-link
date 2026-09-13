import { prisma } from "@/lib/prisma";
import { kstMonthRange, shiftMonth } from "@/lib/month";

export { kstMonthRange, kstMonthKey, shiftMonth } from "@/lib/month";

export type MonthlySummary = {
  month: string;
  /// 수입
  productSales: number;
  shippingIncome: number;
  income: number;
  /// 지출
  goodsCost: number;
  courierCost: number;
  /// 택배비가 실제 청구서 금액이면 true, 건당 단가로 어림잡은 값이면 false
  courierIsActual: boolean;
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

  const [orders, settlements, settings, expenses, courierBill, fixedCosts] =
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
      prisma.courierBill.findUnique({ where: { month } }),
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

  // 무료배송이어도 택배사에는 건당 비용이 나감.
  // 실제 청구서를 적어두면 그 금액이 우선 (포장 크기마다 요금이 달라 어림값은 부정확하다)
  const shipmentCount = settlements.length;
  const courierIsActual = courierBill !== null;
  const courierCost = courierBill
    ? courierBill.amount
    : shipmentCount * settings.courierCost;

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
    courierIsActual,
    fixedCost,
    otherExpense,
    discount,
    expense,
    profit: income - expense,
    orderCount: orders.length,
    shipmentCount,
  };
}

export type DayCell = {
  /// YYYY-MM-DD (한국 날짜)
  date: string;
  day: number;
  /// 그날 판매액 + 받은 배송비
  income: number;
  /// 그날 나간 상품 원가 + 그날 적어둔 지출
  expense: number;
  orderCount: number;
};

/// 한국 날짜(YYYY-MM-DD) 문자열로
function kstDateKey(date: Date) {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

/// 달력에 뿌릴 하루하루 수입·지출.
/// 고정비와 택배비는 달 단위로만 잡히는 돈이라 여기에는 넣지 않는다
export async function dailyBreakdown(month: string): Promise<DayCell[]> {
  const range = kstMonthRange(month);
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 0))
    .getUTCDate();

  const [orders, settlements, expenses] = await Promise.all([
    prisma.order.findMany({
      where: { canceledAt: null, createdAt: range },
      include: { items: true },
    }),
    prisma.settlement.findMany({
      where: { canceledAt: null, createdAt: range },
      select: { createdAt: true, shippingFee: true, shippingCredit: true },
    }),
    prisma.expense.findMany({ where: { spentAt: range } }),
  ]);

  const cells: DayCell[] = Array.from({ length: lastDay }, (_, i) => ({
    date: `${month}-${String(i + 1).padStart(2, "0")}`,
    day: i + 1,
    income: 0,
    expense: 0,
    orderCount: 0,
  }));

  const at = (date: Date) => {
    const key = kstDateKey(date);
    return cells.find((c) => c.date === key);
  };

  for (const order of orders) {
    const cell = at(order.createdAt);
    if (!cell) continue;
    cell.orderCount += 1;
    for (const item of order.items) {
      cell.income += item.price * item.quantity;
      cell.expense += item.cost * item.quantity;
    }
  }

  for (const s of settlements) {
    const cell = at(s.createdAt);
    if (cell) cell.income += s.shippingFee - s.shippingCredit;
  }

  for (const e of expenses) {
    const cell = at(e.spentAt);
    if (cell) cell.expense += e.amount;
  }

  return cells;
}
