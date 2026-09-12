import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate, won } from "@/lib/format";
import { QuickAddForm } from "./QuickAddForm";

export default async function QuickAddPage() {
  const recent = await prisma.product.findMany({
    include: { variants: true },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold lg:text-2xl">빠른 상품등록</h1>
        <p className="mt-1 text-sm text-zinc-500">
          방송 중에는 상품명·가격·재고만 입력하고 바로 등록하세요. 사진과 옵션은
          방송 끝나고 천천히 채우면 돼요.
        </p>
      </div>

      <QuickAddForm />

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">방금 등록한 상품</h2>
          <Link href="/admin/products" className="text-xs text-zinc-500 underline">
            전체 상품 보기
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-200 bg-white py-10 text-center text-sm text-zinc-500">
            아직 등록된 상품이 없어요.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {recent.map((product) => (
              <Link
                key={product.id}
                href={`/admin/products/${product.id}`}
                className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3.5 py-3"
              >
                <div className="min-w-0">
                  <p className="line-clamp-1 text-sm font-medium">
                    {product.name}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {formatDate(product.createdAt)} · 재고{" "}
                    {product.variants.reduce((sum, v) => sum + v.stock, 0)}개
                    {product.imageUrl ? "" : " · 사진 없음"}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold">
                  {won(product.price)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
