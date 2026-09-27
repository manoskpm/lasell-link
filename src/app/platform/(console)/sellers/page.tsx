import Link from "next/link";
import { suspendShopAction } from "@/app/actions/platform";
import { ReasonForm } from "@/components/platform/ReasonForm";
import { ResumeButton } from "@/components/platform/ResumeButton";
import { requirePlatform } from "@/lib/access";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function PlatformSellersPage() {
  await requirePlatform();

  const shops = await prisma.shop.findMany({
    include: { owner: { select: { name: true, loginId: true, phone: true } } },
    orderBy: { id: "asc" },
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold lg:text-2xl">셀러</h1>
        <p className="mt-1 text-sm text-zinc-500">
          정지하면 셀러 화면이 바로 막히고 손님은 새로 살 수 없어요. 이미 받은
          주문과 장부는 그대로 남아요.
        </p>
      </div>

      {shops.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 py-12 text-center text-sm text-zinc-500">
          아직 승인한 셀러가 없어요.{" "}
          <Link href="/platform/applications" className="font-semibold text-zinc-900 underline">
            셀러 신청 보러 가기
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {shops.map((shop) => (
            <section key={shop.id} className="card grid gap-4 lg:grid-cols-[1fr_320px]">
              <div className="flex flex-col gap-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <p className="text-base font-bold">{shop.name}</p>
                  <span
                    className={`chip ${
                      shop.status === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {shop.status === "ACTIVE" ? "영업 중" : "정지"}
                  </span>
                </div>
                <p className="text-zinc-600">
                  {shop.owner.name} ({shop.owner.loginId}) · {shop.owner.phone}
                </p>
                <p className="text-zinc-400">{formatDate(shop.createdAt)} 승인</p>
                {shop.status === "SUSPENDED" && (
                  <p className="mt-1 rounded-xl bg-red-50 px-3 py-2 text-red-700">
                    {shop.suspendedAt ? `${formatDate(shop.suspendedAt)} 정지 · ` : ""}
                    {shop.suspendReason}
                  </p>
                )}
                <Link href="/admin" className="mt-1 w-fit text-sm font-semibold underline">
                  셀러 화면 열어보기
                </Link>
              </div>
              <div>
                {shop.status === "ACTIVE" ? (
                  <ReasonForm
                    action={suspendShopAction}
                    hiddenName="shopId"
                    hiddenValue={shop.id}
                    label="상점 정지"
                    hint="셀러가 자기 화면에서 이 글을 그대로 봐요."
                    placeholder="예: 판매 정책 확인이 필요해요. 운영자에게 연락해주세요."
                    submitLabel="정지하기"
                    doneMessage="정지했어요. 셀러 화면과 새 주문이 막혔어요."
                  />
                ) : (
                  <ResumeButton shopId={shop.id} shopName={shop.name} />
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
