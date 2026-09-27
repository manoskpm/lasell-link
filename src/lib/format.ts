export function won(amount: number) {
  return `${amount.toLocaleString("ko-KR")}원`;
}

export function optionLabel(size?: string | null, color?: string | null) {
  const parts = [size, color].filter(Boolean);
  return parts.length > 0 ? parts.join(" / ") : "기본";
}

/// 예: 09. 28. 오후 1:35 (한국 시간)
/// 실행 환경에 따라 한국어 설정이어도 "AM"이 나오는 경우가 있어 오전/오후를 직접 붙인다
export function formatDate(date: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: "Asia/Seoul",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );
  const hour = Number(parts.hour);
  const period = hour < 12 ? "오전" : "오후";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${parts.month}. ${parts.day}. ${period} ${hour12}:${parts.minute}`;
}

export function formatDateOnly(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(date);
}
