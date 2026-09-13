import Link from "next/link";
import type { DayCell } from "@/lib/finance";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/// 달력 칸은 좁아서 원 단위를 다 적으면 안 보인다. 만원 단위로 줄임
function tiny(value: number) {
  if (value === 0) return "";
  if (Math.abs(value) >= 10_000) return `${Math.round(value / 10_000)}만`;
  return value.toLocaleString("ko-KR");
}

export function Calendar({
  month,
  cells,
  today,
  selected,
}: {
  month: string;
  cells: DayCell[];
  today: string;
  selected?: string;
}) {
  // 1일이 무슨 요일인지 (한국 기준).
  // UTC로 자정을 만들면 전날로 밀리므로 연·월·일만 떼어 계산한다
  const [year, mon] = month.split("-").map(Number);
  const lead = new Date(Date.UTC(year, mon - 1, 1)).getUTCDay();

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`pb-1 text-center text-[11px] font-medium ${
              i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-zinc-400"
            }`}
          >
            {w}
          </div>
        ))}

        {Array.from({ length: lead }, (_, i) => (
          <div key={`lead-${i}`} />
        ))}

        {cells.map((cell) => {
          const isToday = cell.date === today;
          const isSelected = cell.date === selected;
          const quiet = cell.income === 0 && cell.expense === 0;

          return (
            <Link
              key={cell.date}
              href={`/admin/finance?month=${month}&day=${cell.date}`}
              scroll={false}
              className={`flex min-h-[58px] flex-col gap-0.5 rounded-lg border p-1 transition-colors sm:min-h-[72px] sm:p-1.5 ${
                isSelected
                  ? "border-zinc-900 bg-zinc-50"
                  : quiet
                    ? "border-zinc-100 bg-white hover:border-zinc-300"
                    : "border-zinc-200 bg-white hover:border-zinc-400"
              }`}
            >
              <span
                className={`text-[11px] tabular-nums ${
                  isToday
                    ? "font-bold text-zinc-900"
                    : quiet
                      ? "text-zinc-300"
                      : "text-zinc-500"
                }`}
              >
                {cell.day}
                {isToday && <span className="ml-0.5 text-[9px]">오늘</span>}
              </span>

              {cell.income > 0 && (
                <span className="text-[11px] font-semibold leading-tight text-emerald-600 tabular-nums">
                  {tiny(cell.income)}
                </span>
              )}
              {cell.expense > 0 && (
                <span className="text-[11px] leading-tight text-red-500 tabular-nums">
                  −{tiny(cell.expense)}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-400">
        <span className="flex items-center gap-1">
          <i className="h-2 w-2 rounded-full bg-emerald-500" /> 들어온 돈 (판매 +
          배송비)
        </span>
        <span className="flex items-center gap-1">
          <i className="h-2 w-2 rounded-full bg-red-500" /> 나간 돈 (상품 원가 +
          적어둔 지출)
        </span>
        <span>고정비·택배비는 달 단위라 아래 표에서 계산돼요</span>
      </div>
    </div>
  );
}
