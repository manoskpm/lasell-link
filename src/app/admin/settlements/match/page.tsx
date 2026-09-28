import type { Metadata } from "next";
import Link from "next/link";
import { requireOwnShop } from "@/lib/access";
import { DepositMatchForm } from "./DepositMatchForm";

export const metadata: Metadata = { title: "입금 확인" };

export default async function DepositMatchPage() {
  await requireOwnShop();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold">입금 확인</h1>
        <p className="mt-1 text-sm text-zinc-500">
          은행 앱이나 인터넷뱅킹에서 거래내역을 복사해서 붙여넣으면, 금액·이름·시간으로
          미입금 정산과 맞춰봐요. 애매한 건 직접 골라야 하고, 부분입금은 자동으로
          입금완료 처리되지 않아요.
        </p>
      </div>

      <DepositMatchForm />

      <Link href="/admin/settlements" className="btn-secondary">
        정산 목록으로
      </Link>
    </div>
  );
}
