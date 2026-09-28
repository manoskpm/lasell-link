import type { Metadata } from "next";
import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { AppLogoMark } from "@/components/AppLogo";
import { PlatformNav } from "@/components/platform/PlatformNav";
import { COMPANY_NAME } from "@/lib/app";
import { requirePlatform } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: `${COMPANY_NAME} 운영자` };

/// 운영자 전용 화면의 틀. 레이아웃은 화면 이동 때 다시 실행되지 않으므로
/// 각 페이지와 서버 액션도 requirePlatform() 으로 따로 검사한다.
export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const operator = await requirePlatform();
  const pendingCount = await prisma.sellerApplication.count({
    where: { status: "PENDING" },
  });

  return (
    <div className="min-h-dvh bg-zinc-50">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-900 px-4 py-3 text-white lg:px-8">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3">
          <Link href="/platform" className="flex items-center gap-3">
            <span className="rounded-lg bg-white p-1 text-zinc-900">
              <AppLogoMark size={26} />
            </span>
            <span>
              <span className="block text-[11px] font-medium text-zinc-400">
                {COMPANY_NAME}
              </span>
              <span className="block text-base font-bold">운영자</span>
            </span>
          </Link>
          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <span className="mr-1 text-zinc-400">{operator.name}</span>
            <Link href="/admin" className="chip bg-white/10 text-white">
              셀러 화면
            </Link>
            <Link href="/" className="chip bg-white/10 text-white">
              쇼핑몰
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="chip bg-white/10 text-white">
                로그아웃
              </button>
            </form>
          </nav>
        </div>
        <div className="mx-auto mt-3 max-w-[1200px]">
          <PlatformNav pendingCount={pendingCount} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1200px] px-4 py-6 lg:px-8 lg:py-8">
        {children}
      </main>
    </div>
  );
}
