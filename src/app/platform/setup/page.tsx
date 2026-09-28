import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isSetupCodeConfigured } from "@/app/actions/platform";
import { AppLogo } from "@/components/AppLogo";
import { getAccess, hasPendingPlatformSetup } from "@/lib/access";
import { SetupForm } from "./SetupForm";

export const metadata: Metadata = { title: "운영자 설치" };

/// 운영자 계정을 처음 만드는 화면.
/// 설치 코드가 설정돼 있고, 비밀값의 운영자 아이디 중 아직 계정이 없는 게 있을 때만 열린다.
export default async function PlatformSetupPage() {
  const access = await getAccess();
  if (access.isPlatform) redirect("/platform");

  const open =
    (await isSetupCodeConfigured()) && (await hasPendingPlatformSetup());

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[480px] break-keep bg-white px-5 py-10">
      <div className="flex justify-center">
        <AppLogo size={40} className="text-2xl font-bold tracking-tight" company />
      </div>

      <div className="mt-10 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold">운영자 설치</h1>
          <p className="mt-1 text-sm text-zinc-500">
            운영자 계정은 이 화면에서만 만들 수 있어요.
          </p>
        </div>

        {open ? (
          <SetupForm />
        ) : (
          <div className="flex flex-col gap-4">
            <p className="rounded-xl bg-zinc-50 px-3.5 py-3 text-sm text-zinc-600">
              지금은 설치할 수 없어요. 이미 설치가 끝났거나 설치 코드가 설정되지
              않았어요.
            </p>
            <Link href="/login" className="btn-secondary">
              로그인하러 가기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
