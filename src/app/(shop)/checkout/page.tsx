import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { optionLabel, won } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { CheckoutForm } from "./CheckoutForm";

export default async function CheckoutPage() {
  const user = await requireUser("/login");
  const [items, settings] = await Promise.all([
    prisma.cartItem.findMany({
      where: { userId: user.id },
      include: { variant: { include: { product: true } } },
      orderBy: { createdAt: "asc" },
    }),
    getSettings(),
  ]);

  if (items.length === 0) redirect("/cart");

  const total = items.reduce(
    (sum, item) =>
      sum +
      (item.variant.product.price + item.variant.extraPrice) * item.quantity,
    0
  );

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold">주문하기</h1>

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
                (item.variant.product.price + item.variant.extraPrice) *
                  item.quantity
              )}
            </span>
          </div>
        ))}
        <div className="mt-1 flex justify-between border-t border-zinc-100 pt-2 font-bold">
          <span>합계</span>
          <span>{won(total)}</span>
        </div>
      </section>

      <CheckoutForm
        defaults={{
          buyerName: user.name,
          buyerPhone: user.phone,
          zipcode: user.zipcode ?? "",
          address: user.address ?? "",
          addressDetail: user.addressDetail ?? "",
        }}
        bankAccount={settings.bankAccount}
      />
    </div>
  );
}
