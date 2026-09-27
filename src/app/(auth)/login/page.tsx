import Link from "next/link";
import { redirect } from "next/navigation";
import { homePathFor, safeNextPath } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNextPath((await searchParams).next);
  const user = await getCurrentUser();
  if (user) redirect(next ?? homePathFor(user));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">로그인</h1>
        <p className="mt-1 text-sm text-zinc-500">
          주문하려면 로그인이 필요해요.
        </p>
      </div>
      <LoginForm next={next ?? undefined} />
      <p className="text-center text-sm text-zinc-500">
        처음이신가요?{" "}
        <Link href="/signup" className="font-semibold text-zinc-900 underline">
          회원가입
        </Link>
      </p>
      <p className="text-center text-sm text-zinc-500">
        라이브로 판매하고 싶으신가요?{" "}
        <Link href="/seller/apply" className="font-semibold text-zinc-900 underline">
          셀러 신청
        </Link>
      </p>
    </div>
  );
}
