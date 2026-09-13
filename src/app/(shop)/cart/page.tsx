import Link from "next/link";
import { CartItemRow } from "@/components/CartItemRow";
import { requireUser } from "@/lib/auth";
import { won } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { sellingPrice } from "@/lib/price";
import { getSettings } from "@/lib/settings";
import { kstRangeToUtc, todayKst } from "@/lib/date";

export default async function CartPage() {
  const user = await requireUser("/login");

  const today = todayKst();
  const [items, todayOrders, settings] = await Promise.all([
    prisma.cartItem.findMany({
      where: { userId: user.id },
      include: { variant: { include: { product: true } } },
      orderBy: { createdAt: "asc" },
    }),
    // 오늘 이미 사둔(보관중) 주문 — 무료배송은 그날 합산액으로 판단하므로 같이 계산
    prisma.order.findMany({
      where: {
        userId: user.id,
        canceledAt: null,
        settlementId: null,
        createdAt: kstRangeToUtc(today, today),
      },
      include: { items: true },
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
  const todayTotal = todayOrders.reduce(
    (sum, order) =>
      sum + order.items.reduce((s, item) => s + item.price * item.quantity, 0),
    0
  );
  const dayTotal = todayTotal + total;
  const freeOver = settings.freeShippingOver;
  const isFree = freeOver > 0 && dayTotal >= freeOver;
  const needMore = freeOver > 0 ? Math.max(0, freeOver - dayTotal) : 0;

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
        {todayTotal > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500">오늘 이미 담아둔 금액</span>
            <span>{won(todayTotal)}</span>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-zinc-100 pt-2">
          <span className="text-sm text-zinc-500">오늘 누적</span>
          <span className="text-xl font-bold">{won(dayTotal)}</span>
        </div>
        {freeOver > 0 && (
          <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
            {isFree ? (
              <>
                <b className="text-emerald-600">무료배송 적용!</b> 오늘 누적{" "}
                {won(freeOver)} 이상이라 배송비가 없어요.
              </>
            ) : (
              <>
                {won(needMore)} 더 담으면 무료배송이에요! (오늘 누적{" "}
                {won(freeOver)} 이상)
              </>
            )}
          </p>
        )}
        <p className="text-xs text-zinc-500">
          배송비는 나중에 &apos;보관함&apos;에서 한 번에 정산할 때 딱 한 번만
          붙어요.
        </p>
      </div>

      <Link href="/checkout" className="btn-primary">
        주문하기
      </Link>
    </div>
  );
}
