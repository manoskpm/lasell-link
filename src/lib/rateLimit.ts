/// 메모리 안에서만 세는 간단한 요청 횟수 제한.
/// 서버 프로세스 하나에서만 유효하고 재시작하면 초기화되지만, 폰 알림 앱이
/// 오작동해서 요청을 쏟아붓는 사고를 막는 정도로는 충분함.
const hits = new Map<string, number[]>();

/// key로 구분된 요청이 windowMs 동안 limit회를 넘으면 false를 반환
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}
