import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { optionLabel, won } from "@/lib/format";
import { sellingPrice } from "@/lib/price";
import { prisma } from "@/lib/prisma";
import { CheckoutForm } from "./CheckoutForm";

export default async function CheckoutPage() {
  const user = await requireUser("/login");
  const items = await prisma.cartItem.findMany({
    where: { userId: user.id },
    include: { variant: { include: { product: true } } },
    orderBy: { createdAt: "asc" },
  });

  if (items.length === 0) redirect("/cart");

  const total = items.reduce(
    (sum, item) =>
      sum +
      (sellingPrice(item.variant.product) + item.variant.extraPrice) *
        item.quantity,
    0
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold">주문하기</h1>
        <p className="mt-1 text-sm text-zinc-500">
          결제하시면 상품이 바로 확보돼요. 오늘 사신 것은 <b>방송이 끝나면
          자동으로 한 번에 배송</b>되니, 따로 신청하실 필요 없어요.
        </p>
      </div>

      <section className="card flex flex-col gap-2">
        <p className="text-sm font-semibold">주문 상품</p>
        {items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-zinc-600">
              {item.variant.product.name}
              <span className="text-zinc-400">
                {" "}
                · {optionLabel(item.variant.size, item.variant.color)} ·{" "}
                {item.quantity}개
              </span>
            </span>
            <span className="shrink-0 font-medium">
              {won(
                (sellingPrice(item.variant.product) + item.variant.extraPrice) *
                  item.quantity
              )}
            </span>
          </div>
        ))}
        <div className="mt-1 flex justify-between border-t border-zinc-100 pt-2 font-bold">
          <span>상품금액</span>
          <span>{won(total)}</span>
        </div>
        <p className="text-xs text-zinc-500">
          배송비는 정산할 때 계산돼요.
        </p>
      </section>

      <CheckoutForm />
    </div>
  );
}
