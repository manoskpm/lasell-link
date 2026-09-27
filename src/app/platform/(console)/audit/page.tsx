import { requirePlatform } from "@/lib/access";
import { AUDIT_LABELS } from "@/lib/audit";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function PlatformAuditPage() {
  await requirePlatform();

  const logs = await prisma.auditLog.findMany({
    orderBy: { id: "desc" },
    take: 200,
  });
  const actorIds = [...new Set(logs.map((l) => l.actorUserId).filter((id): id is number => id !== null))];
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, name: true },
  });
  const nameOf = (id: number | null) =>
    actors.find((a) => a.id === id)?.name ?? (id ? `#${id}` : "-");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold lg:text-2xl">기록</h1>
        <p className="mt-1 text-sm text-zinc-500">
          승인·거절·정지 같은 중요한 일이 최근 것부터 남아요 (최근 200건).
        </p>
      </div>

      {logs.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-200 py-12 text-center text-sm text-zinc-500">
          아직 기록이 없어요.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">언제</th>
                <th className="px-4 py-2.5 font-medium">누가</th>
                <th className="px-4 py-2.5 font-medium">무엇을</th>
                <th className="px-4 py-2.5 font-medium">내용</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-zinc-100">
                  <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 tabular-nums">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">{nameOf(log.actorUserId)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-medium">
                    {AUDIT_LABELS[log.action] ?? log.action}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-600">{log.detail ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
