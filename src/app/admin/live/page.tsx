import Image from "next/image";
import Link from "next/link";
import { AutoRefresh } from "@/components/AutoRefresh";
import { CloseAllButton } from "./CloseAllButton";
import { ExtendedSaleButton } from "./ExtendedSaleButton";
import { OpenToggle } from "@/components/OpenToggle";
import { itemLine } from "@/lib/courier";
import { kstRangeToUtc, todayKst } from "@/lib/date";
import { formatDate, won } from "@/lib/format";
import { isOnSale, sellingPrice } from "@/lib/price";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { ACTIVE_WINDOW_MS } from "@/app/api/presence/route";

export default async function AdminLivePage() {
  const today = todayKst();

  const [products, recentOrders, settings] = await Promise.all([
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
    getSettings(),
  ]);

  const pendingOrders = await prisma.order.count({
    where: { canceledAt: null, settlementId: null },
  });

  // ── 오늘 현황판 집계 ──────────────────────────────
  const todayOrders = await prisma.order.findMany({
    where: { canceledAt: null, createdAt: kstRangeToUtc(today, today) },
    include: { items: true },
  });

  const items = todayOrders.flatMap((order) => order.items);
  const soldQty = items.reduce((sum, item) => sum + item.quantity, 0);
  const sales = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cost = items.reduce((sum, item) => sum + item.cost * item.quantity, 0);

  // 구매자 1명 = 택배 1박스. 무료배송이어도 택배비는 그대로 나가므로 순익에서 뺀다
  const buyers = new Set(
    todayOrders.map((order) => order.userId ?? `guest:${order.buyerPhone}`)
  ).size;
  const courierCost = buyers * settings.courierCost;
  const profit = sales - cost - courierCost;

  const viewers = await prisma.presence.count({
    where: { lastSeenAt: { gte: new Date(Date.now() - ACTIVE_WINDOW_MS) } },
  });

  const closesAt = settings.saleClosesAt
    ? new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(settings.saleClosesAt)
    : null;

  const open = products.filter((product) => product.isOpen);
  const waiting = products.filter((product) => !product.isOpen);

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh seconds={3} />

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold lg:text-2xl">🔴 라이브 오픈 콘솔</h1>
          <p className="mt-1 text-sm text-zinc-500">
            미리 등록해둔 상품을 방송 순서대로 하나씩 &apos;오픈&apos;하세요.
            오픈한 상품만 손님 화면에 뜹니다. 손님 화면에서는 품절임박 상품이
            맨 위로, 품절된 상품은 맨 아래로 자동 정렬돼요.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/products/quick"
            className="chip bg-zinc-900 text-white"
          >
            ⚡ 빠른등록
          </Link>
          <ExtendedSaleButton closesAt={closesAt} />
          <CloseAllButton count={open.length} pendingOrders={pendingOrders} />
        </div>
      </div>

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-rose-600">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-rose-500" />
            지금 보는 중
          </p>
          <p className="mt-1 text-2xl font-bold text-rose-700">{viewers}명</p>
        </div>
        <Stat label="오늘 구매자" value={`${buyers}명`} />
        <Stat label="오늘 판매수량" value={`${soldQty}개`} />
        <Stat label="오늘 매출" value={won(sales)} hint="상품값만 · 배송비 제외" />
        <Stat
          label="예상 순익"
          value={won(profit)}
          hint={`원가 ${won(cost)} · 택배 ${won(courierCost)} 뺀 금액`}
          accent
        />
      </section>

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

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
      <p className="text-xs text-zinc-400">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold ${
          accent ? "text-emerald-600" : "text-zinc-900"
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-zinc-400">{hint}</p>}
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
