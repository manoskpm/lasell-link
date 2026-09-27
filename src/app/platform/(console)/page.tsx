import Link from "next/link";
import { requirePlatform } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export default async function PlatformHomePage() {
  await requirePlatform();

  const [customers, sellers] = await Promise.all([
    prisma.user.count({ where: { role: "CUSTOMER", platformAccount: false } }),
    prisma.user.count({ where: { role: "SELLER" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold lg:text-2xl">운영자 홈</h1>
        <p className="mt-1 text-sm text-zinc-500">
          셀러 승인과 운영 방침은 운영자만 정할 수 있어요.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="card">
          <p className="text-xs text-zinc-400">승인된 셀러</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{sellers}명</p>
        </div>
        <div className="card">
          <p className="text-xs text-zinc-400">손님 회원</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{customers}명</p>
        </div>
      </section>

      <section className="card flex flex-col gap-2 sm:max-w-md">
        <p className="text-sm font-semibold">셀러 화면 둘러보기</p>
        <p className="text-sm text-zinc-500">
          운영자는 테스트와 지원을 위해 셀러 화면을 전부 볼 수 있어요. 들어가면
          상단에 &quot;운영자로 보는 중&quot; 표시가 나와요.
        </p>
        <Link href="/admin" className="btn-secondary mt-1">
          셀러 화면 열기
        </Link>
      </section>
    </div>
  );
}
