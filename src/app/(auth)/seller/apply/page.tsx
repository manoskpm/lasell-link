import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccess } from "@/lib/access";
import { APP_NAME } from "@/lib/app";
import { getPlatformSettings } from "@/lib/platformSettings";
import { prisma } from "@/lib/prisma";
import { SellerApplyForm } from "./SellerApplyForm";

export const metadata: Metadata = { title: "셀러 신청" };

export default async function SellerApplyPage() {
  const access = await getAccess();

  if (access.isPlatform) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">셀러 신청</h1>
        <p className="rounded-2xl bg-zinc-50 px-4 py-3.5 text-base text-zinc-700">
          운영자 계정으로는 셀러 신청을 할 수 없어요. 셀러용 계정을 따로 만들어
          신청해주세요.
        </p>
        <Link href="/platform" className="btn-secondary">
          운영자 화면으로
        </Link>
      </div>
    );
  }
  if (access.isSeller) redirect("/seller/status");
  if (access.user) {
    const pending = await prisma.sellerApplication.findFirst({
      where: { userId: access.user.id, status: "PENDING" },
    });
    if (pending) redirect("/seller/status");
  }

  const platformSettings = await getPlatformSettings();
  if (!platformSettings.acceptingApplications) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">셀러 신청</h1>
        <p className="rounded-2xl bg-zinc-50 px-4 py-3.5 text-base text-zinc-700">
          지금은 신청을 잠시 받지 않고 있어요. 조금 뒤에 다시 와주세요.
        </p>
        <Link href="/" className="btn-secondary">
          쇼핑몰로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold">셀러 신청</h1>
        <p className="text-base leading-relaxed text-zinc-600">
          {APP_NAME}에서 라이브 판매를 하시려면 신청해주세요. 아래 칸을 위에서부터
          차례대로 채우고 맨 아래 <b>셀러 신청하기</b>를 누르면 끝이에요.
        </p>
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 px-4 py-3.5">
          <p className="text-base font-semibold text-amber-900">
            미리 준비해주세요
          </p>
          <p className="mt-1 text-base text-amber-800">
            사업자등록증 — 위쪽의 번호 10자리를 적어요.
          </p>
        </div>
      </div>

      <SellerApplyForm
        loggedInName={access.user?.name ?? null}
        defaults={{
          ownerName: access.user?.name ?? "",
          phone: access.user?.phone ?? "",
        }}
      />
    </div>
  );
}
