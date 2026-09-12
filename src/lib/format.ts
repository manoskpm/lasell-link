export function won(amount: number) {
  return `${amount.toLocaleString("ko-KR")}원`;
}

export function optionLabel(size?: string | null, color?: string | null) {
  const parts = [size, color].filter(Boolean);
  return parts.length > 0 ? parts.join(" / ") : "기본";
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(date);
}

export function formatDateOnly(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(date);
}
