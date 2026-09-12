import Image from "next/image";
import Link from "next/link";
import { ToggleActive } from "@/components/ToggleActive";
import { won } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    include: { variants: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">상품 · 재고</h1>
        <div className="flex gap-2">
          <Link
            href="/admin/products/quick"
            className="chip bg-zinc-900 text-white"
          >
            ⚡ 빠른등록
          </Link>
          <Link
            href="/admin/products/new"
            className="chip bg-zinc-100 text-zinc-700"
          >
            + 상세 등록
          </Link>
        </div>
      </div>

      {products.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-200 py-16 text-center text-sm text-zinc-500">
          등록된 상품이 없어요.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {products.map((product) => {
            const totalStock = product.variants.reduce(
              (sum, variant) => sum + variant.stock,
              0
            );
            return (
              <div
                key={product.id}
                className="flex items-center gap-3 rounded-2xl border border-zinc-200 p-3"
              >
                <Link
                  href={`/admin/products/${product.id}`}
                  className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100"
                >
                  {product.imageUrl && (
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  )}
                </Link>
                <Link
                  href={`/admin/products/${product.id}`}
                  className="min-w-0 flex-1"
                >
                  <p className="line-clamp-1 text-sm font-medium">
                    {product.name}
                  </p>
                  <p className="text-sm font-bold">{won(product.price)}</p>
                  <p className="text-xs text-zinc-400">
                    {product.category} · 옵션 {product.variants.length}개 · 재고{" "}
                    {totalStock}개
                  </p>
                </Link>
                <ToggleActive
                  productId={product.id}
                  isActive={product.isActive}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
