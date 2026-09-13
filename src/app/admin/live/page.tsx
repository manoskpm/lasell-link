import Image from "next/image";
import Link from "next/link";
import { AutoRefresh } from "@/components/AutoRefresh";
import { CloseAllButton } from "./CloseAllButton";
import { OpenToggle } from "@/components/OpenToggle";
import { itemLine } from "@/lib/courier";
import { kstRangeToUtc, todayKst } from "@/lib/date";
import { formatDate, won } from "@/lib/format";
import { isOnSale, sellingPrice } from "@/lib/price";
import { prisma } from "@/lib/prisma";

export default async function AdminLivePage() {
  const today = todayKst();

  const [products, recentOrders] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      include: { variants: { orderBy: { id: "asc" } } },
      orderBy: [{ isOpen: "desc" }, { openedAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.order.findMany({
      where: { canceledAt: null, createdAt: kstRangeToUtc(today, today) },
      include: { items: true },
      orderBy: { id: "desc" },
      take: 15,
    }),
  ]);

  const open = products.filter((product) => product.isOpen);
  const waiting = products.filter((product) => !product.isOpen);

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh seconds={5} />

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold lg:text-2xl">🔴 라이브 오픈 콘솔</h1>
          <p className="mt-1 text-sm text-zinc-500">
            미리 등록해둔 상품을 방송 순서대로 하나씩 &apos;오픈&apos;하세요.
            오픈한 상품만 손님 화면에 뜹니다. 화면은 5초마다 자동 새로고침돼요.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/products/quick"
            className="chip bg-zinc-900 text-white"
          >
            ⚡ 빠른등록
          </Link>
          <CloseAllButton count={open.length} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <LiveSection
            title={`오픈중 (${open.length})`}
            hint="지금 손님 화면에 보이는 상품이에요. 다 팔렸으면 마감을 눌러 내려주세요."
            products={open}
            empty="오픈중인 상품이 없어요."
          />
          <LiveSection
            title={`오픈 대기 (${waiting.length})`}
            hint="미리 등록해둔 상품이에요. 방송에서 소개할 때 오픈을 누르세요."
            products={waiting}
            empty="대기중인 상품이 없어요. 미리 상품을 등록해두면 여기에 쌓여요."
          />
        </div>

        <aside className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">실시간 주문 (오늘)</h2>
          {recentOrders.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-zinc-200 bg-white py-10 text-center text-sm text-zinc-500">
              아직 주문이 없어요.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      {order.buyerName}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {formatDate(order.createdAt).slice(-5)}
                    </span>
                  </div>
                  {order.items.map((item) => (
                    <p key={item.id} className="text-xs text-zinc-600">
                      {itemLine(item)}
                    </p>
                  ))}
                  <p className="mt-0.5 text-sm font-bold">
                    {won(
                      order.items.reduce(
                        (sum, item) => sum + item.price * item.quantity,
                        0
                      )
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

type LiveProduct = {
  id: number;
  name: string;
  price: number;
  salePrice: number | null;
  imageUrl: string | null;
  isOpen: boolean;
  limitPerPerson: number;
  variants: { id: number; size: string | null; color: string | null; stock: number }[];
};

function LiveSection({
  title,
  hint,
  products,
  empty,
}: {
  title: string;
  hint: string;
  products: LiveProduct[];
  empty: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-zinc-500">{hint}</p>
      </div>

      {products.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-200 bg-white py-10 text-center text-sm text-zinc-500">
          {empty}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {products.map((product) => {
            const totalStock = product.variants.reduce(
              (sum, variant) => sum + variant.stock,
              0
            );
            return (
              <div
                key={product.id}
                className={`flex items-center gap-3 rounded-2xl border bg-white p-3 ${
                  product.isOpen ? "border-rose-200" : "border-zinc-200"
                }`}
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-[10px] text-zinc-400">
                      사진없음
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="block truncate text-sm font-semibold"
                  >
                    {product.name}
                  </Link>
                  <p className="text-sm">
                    {isOnSale(product) && (
                      <span className="mr-1 text-xs text-zinc-400 line-through">
                        {won(product.price)}
                      </span>
                    )}
                    <b>{won(sellingPrice(product))}</b>
                    <span
                      className={`ml-2 text-xs ${
                        totalStock === 0 ? "text-red-500" : "text-zinc-500"
                      }`}
                    >
                      재고 {totalStock}개
                    </span>
                    {product.limitPerPerson > 0 && (
                      <span className="ml-2 text-xs text-amber-600">
                        1인 {product.limitPerPerson}개
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-zinc-400">
                    {product.variants
                      .map(
                        (variant) =>
                          `${[variant.size, variant.color]
                            .filter(Boolean)
                            .join("/") || "기본"} ${variant.stock}`
                      )
                      .join(" · ")}
                  </p>
                </div>

                <OpenToggle
                  productId={product.id}
                  isOpen={product.isOpen}
                  soldOut={totalStock === 0}
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
