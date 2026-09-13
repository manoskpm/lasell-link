import Image from "next/image";
import { notFound } from "next/navigation";
import { VariantPicker } from "@/components/VariantPicker";
import { won } from "@/lib/format";
import { discountRate, isOnSale, sellingPrice } from "@/lib/price";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { isSaleOpen } from "@/lib/stock";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, settings] = await Promise.all([
    prisma.product.findUnique({
      where: { id: Number(id) },
      include: { variants: { orderBy: { id: "asc" } } },
    }),
    getSettings(),
  ]);

  if (!product || !product.isActive || !product.isOpen) notFound();
  if (!isSaleOpen(settings.saleClosesAt)) notFound();

  return (
    <div className="-mx-4 -my-4 flex flex-col">
      <div className="relative aspect-square w-full bg-zinc-100">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            sizes="480px"
            priority
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-400">
            이미지 준비중
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 px-4 py-5">
        <div>
          <span className="chip bg-zinc-100 text-zinc-500">
            {product.category}
          </span>
          <h1 className="mt-2 text-xl font-bold leading-snug">
            {product.name}
          </h1>
          {isOnSale(product) ? (
            <div className="mt-1 flex flex-col gap-0.5">
              <span className="text-sm text-zinc-400 line-through">
                {won(product.price)}
              </span>
              <span className="text-2xl font-bold">
                <span className="mr-2 text-red-500">
                  {discountRate(product)}%
                </span>
                {won(sellingPrice(product))}
              </span>
            </div>
          ) : (
            <p className="mt-1 text-2xl font-bold">{won(product.price)}</p>
          )}
        </div>

        {product.limitPerPerson > 0 && (
          <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm font-medium text-amber-700">
            1인당 {product.limitPerPerson}개까지만 구매할 수 있어요.
          </p>
        )}

        {product.description && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-600">
            {product.description}
          </p>
        )}

        <div className="h-px bg-zinc-100" />

        <VariantPicker
          variants={product.variants}
          basePrice={sellingPrice(product)}
          limitPerPerson={product.limitPerPerson}
        />
      </div>
    </div>
  );
}
