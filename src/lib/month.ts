/// 달(YYYY-MM) 계산만 하는 순수 함수들.
/// 클라이언트 컴포넌트에서도 쓰려고 DB를 건드리는 finance.ts와 분리해 둔다

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
