type PricedProduct = { price: number; salePrice: number | null };

/// 실제 판매가. 특가가 있으면 특가로 판다
export function sellingPrice(product: PricedProduct) {
  return product.salePrice ?? product.price;
}

/// 특가가 정가보다 쌀 때만 할인으로 인정
export function isOnSale(product: PricedProduct) {
  return product.salePrice !== null && product.salePrice < product.price;
}

export function discountRate(product: PricedProduct) {
  if (!isOnSale(product)) return 0;
  return Math.round((1 - (product.salePrice ?? 0) / product.price) * 100);
}
