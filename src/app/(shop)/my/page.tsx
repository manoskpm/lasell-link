import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { AppLogo } from "@/components/AppLogo";
import { getAccess } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { ProfileForm } from "./ProfileForm";

export default async function MyPage() {
  const user = await requireUser("/login");
  const access = await getAccess();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold">{user.name}님</h1>
        <p className="mt-0.5 text-sm text-zinc-500">{user.loginId}</p>
      </div>

      {access.isPlatform && (
        <Link href="/platform" className="btn-secondary">
          운영자 화면으로 이동
        </Link>
      )}
      {access.canUseSellerConsole && (
        <Link href="/admin" className="btn-secondary">
          셀러 화면으로 이동
        </Link>
      )}

      <Link href="/my/orders" className="btn-secondary">
        주문내역 보기
      </Link>

      {!access.isPlatform && !access.canUseSellerConsole && (
        <Link
          href={access.isSeller ? "/seller/status" : "/seller/apply"}
          className="rounded-xl border border-dashed border-zinc-300 px-4 py-3 text-center text-sm text-zinc-600"
        >
          {access.isSeller
            ? "내 상점 상태 보기"
            : "라이브로 판매하고 싶으신가요? 셀러 신청하기"}
        </Link>
      )}

      <div className="h-px bg-zinc-100" />

      <ProfileForm
        defaults={{
          name: user.name,
          phone: user.phone,
          zipcode: user.zipcode ?? "",
          address: user.address ?? "",
          addressDetail: user.addressDetail ?? "",
        }}
      />

      <form action={logoutAction}>
        <button type="submit" className="w-full py-3 text-sm text-zinc-400">
          로그아웃
        </button>
      </form>

      <div className="flex justify-center pb-2">
        <AppLogo size={16} className="text-[11px] font-semibold text-zinc-300" />
      </div>
    </div>
  );
}
