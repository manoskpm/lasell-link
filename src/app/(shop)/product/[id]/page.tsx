import Image from "next/image";
import { notFound } from "next/navigation";
import { VariantPicker } from "@/components/VariantPicker";
import { won } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id: Number(id) },
    include: { variants: { orderBy: { id: "asc" } } },
  });

  if (!product || !product.isActive) notFound();

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
          <p className="mt-1 text-2xl font-bold">{won(product.price)}</p>
        </div>

        {product.description && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-600">
            {product.description}
          </p>
        )}

        <div className="h-px bg-zinc-100" />

        <VariantPicker variants={product.variants} basePrice={product.price} />
      </div>
    </div>
  );
}
