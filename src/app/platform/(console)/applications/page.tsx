import Link from "next/link";
import { requirePlatform } from "@/lib/access";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const TABS = [
  { status: "PENDING", label: "대기" },
  { status: "APPROVED", label: "승인" },
  { status: "REJECTED", label: "거절" },
] as const;

export default async function PlatformApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requirePlatform();

  const { status: statusParam } = await searchParams;
  const status = TABS.some((t) => t.status === statusParam) ? statusParam! : "PENDING";

  const [applications, counts] = await Promise.all([
    prisma.sellerApplication.findMany({
      where: { status },
      include: { user: { select: { loginId: true } } },
      orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" },
    }),
    prisma.sellerApplication.groupBy({ by: ["status"], _count: true }),
  ]);
  const countOf = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold lg:text-2xl">셀러 신청</h1>
        <p className="mt-1 text-sm text-zinc-500">
          오래 기다린 신청이 위에 있어요. 눌러서 내용을 보고 승인하거나 거절해주세요.
        </p>
      </div>

      <div className="flex gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.status}
            href={`/platform/applications?status=${tab.status}`}
            className={`chip ${
              status === tab.status ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600"
            }`}
          >
            {tab.label} {countOf(tab.status)}
          </Link>
        ))}
      </div>

      {applications.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-200 py-12 text-center text-sm text-zinc-500">
          {status === "PENDING" ? "기다리는 신청이 없어요." : "해당하는 신청이 없어요."}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {applications.map((application) => (
            <Link
              key={application.id}
              href={`/platform/applications/${application.id}`}
              className="card flex flex-wrap items-center justify-between gap-3 hover:border-zinc-400"
            >
              <div>
                <p className="font-semibold">{application.shopName}</p>
                <p className="mt-0.5 text-sm text-zinc-500">
                  {application.ownerName} · {application.phone} ·{" "}
                  {application.channels.split(",").join(", ")}
                </p>
              </div>
              <span className="text-xs text-zinc-400">
                {formatDate(application.createdAt)} 신청
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
