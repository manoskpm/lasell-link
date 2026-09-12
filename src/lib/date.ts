const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/// 서버 시간대와 상관없이 한국 날짜(YYYY-MM-DD)로 변환
export function kstDateKey(date: Date) {
  return new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

export function todayKst() {
  return kstDateKey(new Date());
}

export function daysAgoKst(days: number) {
  return kstDateKey(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
}

export function monthStartKst() {
  return `${todayKst().slice(0, 7)}-01`;
}

/// 한국 날짜 문자열(YYYY-MM-DD)을 DB 조회용 UTC 구간으로 변환
export function kstRangeToUtc(from?: string, to?: string) {
  const range: { gte?: Date; lte?: Date } = {};
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    range.gte = new Date(`${from}T00:00:00+09:00`);
  }
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    range.lte = new Date(`${to}T23:59:59.999+09:00`);
  }
  return range;
}
