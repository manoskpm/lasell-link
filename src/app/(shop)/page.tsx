import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { won } from "@/lib/format";
import { discountRate, isOnSale, sellingPrice } from "@/lib/price";
import { getSettings } from "@/lib/settings";
import { isSaleOpen, sortForShop, stockState, totalStock } from "@/lib/stock";

const CATEGORIES = ["전체", "의류", "악세서리", "잡화"];

export default async function ShopHomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const selected = category && CATEGORIES.includes(category) ? category : "전체";

  const [products, settings] = await Promise.all([
    prisma.product.findMany({
      where: {
        isActive: true,
        isOpen: true, // 방송에서 오픈한 상품만 손님 화면에 보임
        ...(selected === "전체" ? {} : { category: selected }),
      },
      include: { variants: true },
      orderBy: [{ openedAt: "desc" }, { createdAt: "desc" }],
    }),
    getSettings(),
  ]);

  // 연장판매 마감 시각이 지났으면 손님 화면에서는 더 이상 안 보여줌
  const saleOpen = isSaleOpen(settings.saleClosesAt);
  const visible = saleOpen ? products : [];

  // 품절임박 → 판매중 → 품절 순서. 다 팔린 건 알아서 아래로 내려감
  const sorted = sortForShop(visible, settings.lowStockAt);

  return (
    <div className="flex flex-col gap-4">
      {saleOpen && settings.saleClosesAt && (
        <div className="rounded-xl bg-rose-50 px-3.5 py-3 text-sm">
          <p className="font-semibold text-rose-700">
            방송은 끝났지만 아직 구매할 수 있어요
          </p>
          <p className="mt-0.5 text-rose-600">
            {formatDeadline(settings.saleClosesAt)}까지 주문하시면 이번 배송에
            같이 나가요.
          </p>
        </div>
      )}

      {!saleOpen && (
        <p className="rounded-xl bg-zinc-100 px-3.5 py-3 text-sm text-zinc-600">
          이번 방송 판매가 마감됐어요. 다음 방송에서 만나요!
        </p>
      )}

      {settings.noticeText && (
        <p className="whitespace-pre-wrap rounded-xl bg-zinc-50 px-3.5 py-3 text-sm text-zinc-600">
          {settings.noticeText}
        </p>
      )}

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {CATEGORIES.map((item) => (
          <Link
            key={item}
            href={item === "전체" ? "/" : `/?category=${item}`}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
              selected === item
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600"
            }`}
          >
            {item}
          </Link>
        ))}
      </div>

      {sorted.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-200 py-16 text-center text-sm text-zinc-500">
          지금은 열린 상품이 없어요. 방송이 시작되면 여기에 떠요.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {sorted.map((product) => {
            const stock = totalStock(product);
            const state = stockState(product, settings.lowStockAt);
            return (
              <Link
                key={product.id}
                href={`/product/${product.id}`}
                className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200"
              >
                <div className="relative aspect-square bg-zinc-100">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 480px) 50vw, 240px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                      이미지 준비중
                    </div>
                  )}
                  {state === "임박" && (
                    <span className="absolute left-2 top-2 rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-bold text-white shadow">
                      {stock}개 남음
                    </span>
                  )}
                  {state === "판매중" &&
                    product.openedAt &&
                    Date.now() - product.openedAt.getTime() < 10 * 60 * 1000 && (
                      <span className="absolute left-2 top-2 rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] font-bold text-white">
                        방금 오픈
                      </span>
                    )}
                  {state === "품절" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-semibold text-white">
                      품절
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-0.5 p-3">
                  <p className="line-clamp-2 text-sm leading-snug">
                    {product.name}
                  </p>
                  {isOnSale(product) ? (
                    <>
                      <p className="text-xs text-zinc-400 line-through">
                        {won(product.price)}
                      </p>
                      <p className="text-base font-bold">
                        <span className="mr-1 text-red-500">
                          {discountRate(product)}%
                        </span>
                        {won(sellingPrice(product))}
                      </p>
                    </>
                  ) : (
                    <p className="text-base font-bold">{won(product.price)}</p>
                  )}
                  <p
                    className={`text-xs ${
                      state === "임박" ? "font-semibold text-rose-600" : "text-zinc-400"
                    }`}
                  >
                    {state === "품절"
                      ? "품절"
                      : state === "임박"
                        ? `마지막 ${stock}개`
                        : `재고 ${stock}개`}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/// 마감 시각을 "오늘 밤 11시" / "내일 오전 10시"처럼 읽기 쉽게
function formatDeadline(when: Date) {
  const fmt = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return fmt.format(when);
}
