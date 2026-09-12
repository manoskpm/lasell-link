import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateStockAction } from "@/app/actions/products";
import { DeleteProductButton } from "@/components/DeleteProductButton";
import { ToggleActive } from "@/components/ToggleActive";
import { optionLabel, won } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function AdminProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id: Number(id) },
    include: { variants: { orderBy: { id: "asc" } } },
  });

  if (!product) notFound();

  const totalStock = product.variants.reduce(
    (sum, variant) => sum + variant.stock,
    0
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
          {product.imageUrl && (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              sizes="80px"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold leading-snug">{product.name}</h1>
          <p className="text-base font-bold">{won(product.price)}</p>
          <p className="text-xs text-zinc-400">
            원가 {won(product.cost)} · 총 재고 {totalStock}개
          </p>
        </div>
        <ToggleActive productId={product.id} isActive={product.isActive} />
      </div>

      <form action={updateStockAction} className="flex flex-col gap-3">
        <input type="hidden" name="productId" value={product.id} />
        <p className="text-sm font-semibold">옵션별 재고</p>

        {product.variants.map((variant) => (
          <div
            key={variant.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 px-3.5 py-2.5"
          >
            <span className="text-sm font-medium">
              {optionLabel(variant.size, variant.color)}
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                name={`stock_${variant.id}`}
                defaultValue={variant.stock}
                min={0}
                inputMode="numeric"
                className="w-20 rounded-lg border border-zinc-300 px-2.5 py-2 text-center text-base"
              />
              <span className="text-sm text-zinc-400">개</span>
            </div>
          </div>
        ))}

        <button type="submit" className="btn-primary">
          재고 저장
        </button>
      </form>

      <Link href="/admin/products" className="btn-secondary">
        상품 목록으로
      </Link>

      <DeleteProductButton productId={product.id} />
    </div>
  );
}
