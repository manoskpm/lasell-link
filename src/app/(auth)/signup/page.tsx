import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SignupForm } from "./SignupForm";

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/");

  const isFirstUser = (await prisma.user.count()) === 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">회원가입</h1>
        <p className="mt-1 text-sm text-zinc-500">
          배송지를 미리 저장해두면 주문할 때 자동으로 입력돼요.
        </p>
      </div>

      {isFirstUser && (
        <p className="rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-700">
          첫 번째 가입 계정은 <b>운영자(관리자)</b> 계정이 됩니다. 사장님 계정을
          먼저 만들어주세요!
        </p>
      )}

      <SignupForm />

      <p className="text-center text-sm text-zinc-500">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-semibold text-zinc-900 underline">
          로그인
        </Link>
      </p>
    </div>
  );
}
