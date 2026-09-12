import Link from "next/link";
import { CartItemRow } from "@/components/CartItemRow";
import { requireUser } from "@/lib/auth";
import { won } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function CartPage() {
  const user = await requireUser("/login");

  const items = await prisma.cartItem.findMany({
    where: { userId: user.id },
    include: { variant: { include: { product: true } } },
    orderBy: { createdAt: "asc" },
  });

  const total = items.reduce(
    (sum, item) =>
      sum +
      (item.variant.product.price + item.variant.extraPrice) * item.quantity,
    0
  );

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
            unitPrice={item.variant.product.price + item.variant.extraPrice}
            quantity={item.quantity}
            stock={item.variant.stock}
          />
        ))}
      </div>

      <div className="card flex items-center justify-between">
        <span className="text-sm text-zinc-500">총 주문금액</span>
        <span className="text-xl font-bold">{won(total)}</span>
      </div>

      <Link href="/checkout" className="btn-primary">
        주문하기
      </Link>
    </div>
  );
}
