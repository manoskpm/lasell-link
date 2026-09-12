import Link from "next/link";
import { CartItemRow } from "@/components/CartItemRow";
import { requireUser } from "@/lib/auth";
import { won } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { sellingPrice } from "@/lib/price";
import { getSettings } from "@/lib/settings";
import { amountUntilFreeShipping, calcShippingFee } from "@/lib/shipping";

export default async function CartPage() {
  const user = await requireUser("/login");

  const [items, settings] = await Promise.all([
    prisma.cartItem.findMany({
      where: { userId: user.id },
      include: { variant: { include: { product: true } } },
      orderBy: { createdAt: "asc" },
    }),
    getSettings(),
  ]);

  const total = items.reduce(
    (sum, item) =>
      sum +
      (sellingPrice(item.variant.product) + item.variant.extraPrice) *
        item.quantity,
    0
  );
  const shippingFee = calcShippingFee({
    itemsTotal: total,
    shippingFee: settings.shippingFee,
    freeShippingOver: settings.freeShippingOver,
  });
  const needMore = amountUntilFreeShipping({
    itemsTotal: total,
    freeShippingOver: settings.freeShippingOver,
  });

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-5 py-20">
        <p className="text-sm text-zinc-500">장바구니가 비어있어요.</p>
        <Link href="/" className="btn-primary w-40">
          상품 보러가기
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">장바구니</h1>

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <CartItemRow
            key={item.id}
            id={item.id}
            name={item.variant.product.name}
            imageUrl={item.variant.product.imageUrl}
            size={item.variant.size}
            color={item.variant.color}
            unitPrice={
              sellingPrice(item.variant.product) + item.variant.extraPrice
            }
            quantity={item.quantity}
            stock={item.variant.stock}
          />
        ))}
      </div>

      <div className="card flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500">상품금액</span>
          <span>{won(total)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500">배송비</span>
          <span>{shippingFee === 0 ? "무료" : won(shippingFee)}</span>
        </div>
        {needMore > 0 && (
          <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
            {won(needMore)} 더 담으면 무료배송이에요!
          </p>
        )}
        <div className="flex items-center justify-between border-t border-zinc-100 pt-2">
          <span className="text-sm text-zinc-500">총 결제금액</span>
          <span className="text-xl font-bold">{won(total + shippingFee)}</span>
        </div>
      </div>

      <Link href="/checkout" className="btn-primary">
        주문하기
      </Link>
    </div>
  );
}
