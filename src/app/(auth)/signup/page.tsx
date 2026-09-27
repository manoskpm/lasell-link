import Link from "next/link";
import { redirect } from "next/navigation";
import { homePathFor } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { SignupForm } from "./SignupForm";

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect(homePathFor(user));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">회원가입</h1>
        <p className="mt-1 text-sm text-zinc-500">
          배송지를 미리 저장해두면 주문할 때 자동으로 입력돼요.
        </p>
      </div>

      <SignupForm />

      <p className="text-center text-sm text-zinc-500">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-semibold text-zinc-900 underline">
          로그인
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
