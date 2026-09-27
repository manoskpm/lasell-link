import type { Metadata } from "next";
import Link from "next/link";
import { getAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { formatDateOnly } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "셀러 신청 상태" };

export default async function SellerStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const user = await requireUser("/login?next=/seller/status");
  const access = await getAccess();
  const { submitted } = await searchParams;

  const application = await prisma.sellerApplication.findFirst({
    where: { userId: user.id },
    orderBy: { id: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">셀러 신청 상태</h1>

      {submitted && application?.status === "PENDING" && (
        <p className="rounded-2xl bg-emerald-50 px-4 py-3.5 text-base font-semibold text-emerald-800">
          신청이 잘 접수됐어요. 고맙습니다!
        </p>
      )}

      {/* 정지된 상점 */}
      {access.isSeller && access.shop?.status === "SUSPENDED" ? (
        <StatusCard tone="red" title="상점이 잠시 멈춰 있어요">
          <p>
            지금은 셀러 화면을 쓸 수 없고, 손님도 새로 살 수 없어요. 이미 받은
            주문과 장부는 그대로 남아 있어요.
          </p>
          <SuspendReason shopId={access.shop.id} />
          <p>다시 열려면 운영자에게 연락해주세요.</p>
        </StatusCard>
      ) : access.isSeller ? (
        <StatusCard tone="green" title="셀러로 승인됐어요!">
          <p>이제 상품을 올리고 방송을 시작할 수 있어요.</p>
          <Link href="/admin" className="btn-primary mt-2 py-4 text-lg">
            셀러 화면 열기
          </Link>
        </StatusCard>
      ) : !application ? (
        <StatusCard tone="gray" title="아직 셀러 신청을 안 하셨어요">
          <p>라이브 판매를 하시려면 먼저 신청해주세요.</p>
          <Link href="/seller/apply" className="btn-primary mt-2 py-4 text-lg">
            셀러 신청하기
          </Link>
        </StatusCard>
      ) : application.status === "PENDING" ? (
        <StatusCard tone="amber" title="운영자가 확인하고 있어요">
          <p>
            {formatDateOnly(application.createdAt)}에 신청하셨어요. 확인이 끝나면
            이 화면에서 결과를 볼 수 있어요.
          </p>
          <p className="text-zinc-500">
            따로 하실 일은 없어요. 적어주신 전화번호로 연락드릴 수도 있어요.
          </p>
        </StatusCard>
      ) : application.status === "REJECTED" ? (
        <StatusCard tone="red" title="이번 신청은 승인되지 않았어요">
          {application.rejectReason && (
            <div className="rounded-xl bg-white px-4 py-3">
              <p className="text-sm font-semibold text-zinc-500">운영자가 남긴 이유</p>
              <p className="mt-1">{application.rejectReason}</p>
            </div>
          )}
          <p>이유를 보고 고쳐서 다시 신청할 수 있어요.</p>
          <Link href="/seller/apply" className="btn-primary mt-2 py-4 text-lg">
            다시 신청하기
          </Link>
        </StatusCard>
      ) : (
        <StatusCard tone="gray" title="신청이 처리됐어요">
          <p>화면을 새로고침해주세요.</p>
        </StatusCard>
      )}

      {application && (
        <section className="flex flex-col gap-2 rounded-2xl border border-zinc-200 p-4 text-base">
          <p className="text-sm font-semibold text-zinc-500">신청한 내용</p>
          <Row label="상점 이름" value={application.shopName} />
          <Row label="대표자" value={application.ownerName} />
          <Row label="연락처" value={application.phone} />
          <Row label="방송하는 곳" value={application.channels.split(",").join(", ")} />
        </section>
      )}

      <Link href="/" className="btn-secondary">
        쇼핑몰로 돌아가기
      </Link>
    </div>
  );
}

async function SuspendReason({ shopId }: { shopId: number }) {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { suspendReason: true },
  });
  if (!shop?.suspendReason) return null;
  return (
    <div className="rounded-xl bg-white px-4 py-3">
      <p className="text-sm font-semibold text-zinc-500">운영자가 남긴 이유</p>
      <p className="mt-1">{shop.suspendReason}</p>
    </div>
  );
}

const TONES = {
  green: "border-emerald-200 bg-emerald-50",
  amber: "border-amber-200 bg-amber-50",
  red: "border-red-200 bg-red-50",
  gray: "border-zinc-200 bg-zinc-50",
};

function StatusCard({
  tone,
  title,
  children,
}: {
  tone: keyof typeof TONES;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`flex flex-col gap-3 rounded-2xl border-2 p-5 text-base leading-relaxed text-zinc-800 ${TONES[tone]}`}
    >
      <h2 className="text-xl font-bold text-zinc-900">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="w-24 shrink-0 text-zinc-500">{label}</span>
      <span className="text-zinc-900">{value}</span>
    </div>
  );
}
