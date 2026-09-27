import { prisma } from "./prisma";

/// 손님 화면에 보이는 상점.
/// 지금은 상점을 1개만 운영하므로 가장 먼저 만든 상점이다.
/// 여러 상점으로 넓힐 때는 이 함수만 "주소(/s/상점주소)로 상점 찾기"로 바꾸면 된다.
export async function getStorefrontShop() {
  return prisma.shop.findFirst({ orderBy: { id: "asc" } });
}

/// 손님이 지금 새로 담거나 살 수 있는지.
/// 안 되면 손님에게 그대로 보여줄 문장을, 되면 null 을 돌려준다.
export async function storeClosedReason(): Promise<string | null> {
  const shop = await getStorefrontShop();
  if (!shop) {
    return "아직 문을 연 상점이 없어요. 상점이 문을 열면 바로 살 수 있어요.";
  }
  if (shop.status !== "ACTIVE") {
    return "지금은 상점이 잠시 쉬고 있어요. 다시 문을 열면 살 수 있어요.";
  }
  return null;
}
