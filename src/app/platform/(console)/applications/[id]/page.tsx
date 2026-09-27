import Link from "next/link";
import { notFound } from "next/navigation";
import { rejectSellerApplicationAction } from "@/app/actions/platform";
import { ApproveButton } from "@/components/platform/ApproveButton";
import { ReasonForm } from "@/components/platform/ReasonForm";
import { requirePlatform } from "@/lib/access";
import { formatBizNumber } from "@/lib/bizNumber";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "대기",
  APPROVED: "승인",
  REJECTED: "거절",
};

export default async function PlatformApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePlatform();

  const id = Number((await params).id);
  const application = Number.isInteger(id)
    ? await prisma.sellerApplication.findUnique({
        where: { id },
        include: {
          user: { select: { loginId: true, name: true, createdAt: true } },
          reviewedBy: { select: { name: true } },
        },
      })
    : null;
  if (!application) notFound();

  // 상점 분리 전이라 상점은 1개까지만
  const existingShop = await prisma.shop.findFirst({ select: { name: true } });
  const blockedReason = existingShop
    ? `지금은 상점을 1개만 운영할 수 있어요. 이미 '${existingShop.name}' 상점이 있어요. 상점 분리 작업이 끝나면 승인할 수 있으니 그때까지 대기로 두면 돼요.`
    : null;

  const history = await prisma.sellerApplication.findMany({
    where: { userId: application.userId, id: { not: application.id } },
    orderBy: { id: "desc" },
    select: { id: true, status: true, createdAt: true, rejectReason: true },
  });

  return (
    <div className="flex flex-col gap-5">
      <Link href="/platform/applications" className="text-sm text-zinc-500 underline">
        ← 신청 목록으로
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold lg:text-2xl">{application.shopName}</h1>
        <span className="chip bg-zinc-100 text-zinc-700">
          {STATUS_LABEL[application.status] ?? application.status}
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <section className="card flex flex-col gap-3 text-sm">
          <Row label="신청일" value={formatDate(application.createdAt)} />
          <Row label="대표자" value={application.ownerName} />
          <Row label="연락처" value={application.phone} />
          <Row label="방송하는 곳" value={application.channels.split(",").join(", ")} />
          <Row
            label="방송 주소"
            value={
              application.channelUrl ? (
                <a
                  href={
                    /^https?:\/\//.test(application.channelUrl)
                      ? application.channelUrl
                      : `https://${application.channelUrl}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all underline"
                >
                  {application.channelUrl}
                </a>
              ) : (
                "적지 않음"
              )
            }
          />
          <Row label="파는 상품" value={application.mainProducts} />
          <Row label="하고 싶은 말" value={application.message ?? "적지 않음"} />
          <Row
            label="가입 계정"
            value={`${application.user.name} (${application.user.loginId}) · ${formatDate(application.user.createdAt)} 가입`}
          />

          <div className="mt-2 rounded-2xl bg-zinc-50 p-4">
            <p className="text-xs font-semibold text-zinc-500">사업자등록번호</p>
            <p className="mt-1 text-xl font-bold tracking-wider tabular-nums">
              {formatBizNumber(application.bizNumber)}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              번호 형식(숫자 10자리와 검증 숫자)은 확인됐어요. 실제로 영업 중인
              사업자인지는 국세청 홈택스의 사업자 상태 조회에 이 번호를 넣어
              직접 확인해주세요.
            </p>
            <a
              href="https://www.hometax.go.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm font-semibold underline"
            >
              홈택스 열기 ↗
            </a>
          </div>

          {history.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-zinc-500">이 분의 이전 신청</p>
              <ul className="mt-1 flex flex-col gap-1">
                {history.map((h) => (
                  <li key={h.id} className="text-zinc-600">
                    {formatDate(h.createdAt)} · {STATUS_LABEL[h.status] ?? h.status}
                    {h.rejectReason ? ` · ${h.rejectReason}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-4">
          {application.status === "PENDING" ? (
            <>
              <div className="card flex flex-col gap-2">
                <p className="text-sm font-semibold">승인</p>
                <p className="text-xs text-zinc-500">
                  승인하면 이 분이 셀러가 되고 상점이 생겨요. 바로 셀러 화면을 쓸 수 있어요.
                </p>
                <ApproveButton
                  applicationId={application.id}
                  shopName={application.shopName}
                  blockedReason={blockedReason}
                />
              </div>
              <div className="card">
                <ReasonForm
                  action={rejectSellerApplicationAction}
                  hiddenName="applicationId"
                  hiddenValue={application.id}
                  label="거절"
                  hint="신청하신 분이 자기 화면에서 이 글을 그대로 봐요. 무엇을 고치면 되는지 적어주세요."
                  placeholder="예: 사업자등록번호가 홈택스에서 조회되지 않아요. 번호를 다시 확인해서 신청해주세요."
                  submitLabel="거절하기"
                  doneMessage="거절했어요. 신청하신 분이 이유를 보고 다시 신청할 수 있어요."
                />
              </div>
            </>
          ) : (
            <div className="card flex flex-col gap-1 text-sm">
              <p className="font-semibold">
                {STATUS_LABEL[application.status]}된 신청이에요
              </p>
              {application.reviewedAt && (
                <p className="text-zinc-500">
                  {formatDate(application.reviewedAt)}
                  {application.reviewedBy ? ` · ${application.reviewedBy.name}` : ""}
                </p>
              )}
              {application.rejectReason && (
                <p className="mt-1 text-zinc-700">이유: {application.rejectReason}</p>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-24 shrink-0 text-zinc-500">{label}</span>
      <span className="min-w-0 text-zinc-900">{value}</span>
    </div>
  );
}
