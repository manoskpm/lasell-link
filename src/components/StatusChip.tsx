const COLORS: Record<string, string> = {
  미입금: "bg-amber-100 text-amber-700",
  입금완료: "bg-emerald-100 text-emerald-700",
  접수전: "bg-zinc-100 text-zinc-500",
  접수완료: "bg-blue-100 text-blue-700",
  발송완료: "bg-emerald-100 text-emerald-700",
};

export function StatusChip({ status }: { status: string }) {
  return (
    <span className={`chip ${COLORS[status] ?? "bg-zinc-100 text-zinc-600"}`}>
      {status}
    </span>
  );
}
