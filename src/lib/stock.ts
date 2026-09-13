/// 상품의 재고 상태. 손님 화면 정렬과 강조 표시에 씀
export type StockState = "임박" | "판매중" | "품절";

type WithVariants = { variants: { stock: number }[] };

export function totalStock(product: WithVariants) {
  return product.variants.reduce((sum, variant) => sum + variant.stock, 0);
}

export function stockState(product: WithVariants, lowStockAt: number): StockState {
  const stock = totalStock(product);
  if (stock <= 0) return "품절";
  if (stock <= lowStockAt) return "임박";
  return "판매중";
}

const ORDER: Record<StockState, number> = { 임박: 0, 판매중: 1, 품절: 2 };

/// 품절임박 → 판매중 → 품절 순서로 정렬.
/// 같은 상태 안에서는 임박한 건 적게 남은 순, 나머지는 최근 오픈 순
export function sortForShop<T extends WithVariants & { openedAt: Date | null; createdAt: Date }>(
  products: T[],
  lowStockAt: number
) {
  return [...products].sort((a, b) => {
    const stateDiff = ORDER[stockState(a, lowStockAt)] - ORDER[stockState(b, lowStockAt)];
    if (stateDiff !== 0) return stateDiff;

    if (stockState(a, lowStockAt) === "임박") {
      const left = totalStock(a) - totalStock(b);
      if (left !== 0) return left;
    }

    const at = (a.openedAt ?? a.createdAt).getTime();
    const bt = (b.openedAt ?? b.createdAt).getTime();
    return bt - at;
  });
}

/// 연장판매가 아직 유효한지
export function isSaleOpen(saleClosesAt: Date | null) {
  if (!saleClosesAt) return true; // 연장판매 설정이 없으면 평소대로
  return saleClosesAt.getTime() > Date.now();
}
