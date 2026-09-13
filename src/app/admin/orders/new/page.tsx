import Link from "next/link";
import { ProxyOrderForm } from "./ProxyOrderForm";
import { won } from "@/lib/format";
import { sellingPrice } from "@/lib/price";
import { prisma } from "@/lib/prisma";

export default async function AdminNewOrderPage() {
  const [customers, products] = await Promise.all([
    prisma.user.findMany({
      where: { role: "CUSTOMER" },
      orderBy: [{ followedAt: "desc" }, { name: "asc" }],
    }),
    prisma.product.findMany({
      where: { isActive: true },
      include: { variants: { orderBy: { id: "asc" } } },
      orderBy: [{ isOpen: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold">대리주문</h1>
        <p className="mt-1 text-sm text-zinc-500">
          방송 댓글로 &quot;저요&quot; 하신 손님 주문을 대신 넣어드려요. 주문은
          손님 구매 내역에 들어가고, 방송종료 때 배송으로 함께 넘어갑니다.
        </p>
      </div>

      {customers.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-200 py-12 text-center text-sm text-zinc-500">
          아직 가입한 손님이 없어요.
        </p>
      ) : (
        <ProxyOrderForm
          customers={customers.map((customer) => ({
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            loginId: customer.loginId,
            followed: Boolean(customer.followedAt),
          }))}
          products={products.map((product) => ({
            id: product.id,
            name: product.name,
            isOpen: product.isOpen,
            price: won(sellingPrice(product)),
            variants: product.variants.map((variant) => ({
              id: variant.id,
              size: variant.size,
              color: variant.color,
              stock: variant.stock,
            })),
          }))}
        />
      )}

      <Link href="/admin/orders" className="btn-secondary">
        주문 목록으로
      </Link>
    </div>
  );
}
