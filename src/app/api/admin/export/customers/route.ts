import { sellerConsoleApiGuard } from "@/lib/access";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { buildSheet, xlsxResponse } from "@/lib/xlsx";

export async function GET() {
  const denied = await sellerConsoleApiGuard();
  if (denied) return denied;

  // 운영자 계정은 셀러의 회원 목록에 나오지 않게 뺀다 (운영자 아이디 노출 방지)
  const customers = await prisma.user.findMany({
    where: { platformAccount: false },
    include: { orders: { include: { items: true } } },
    orderBy: { createdAt: "desc" },
  });

  const rows = customers.map((customer) => ({
    id: customer.id,
    loginId: customer.loginId,
    name: customer.name,
    phone: customer.phone,
    zipcode: customer.zipcode ?? "",
    address: [customer.address, customer.addressDetail]
      .filter(Boolean)
      .join(" "),
    role: customer.role === "SELLER" ? "셀러" : "일반회원",
    createdAt: formatDate(customer.createdAt),
    orderCount: customer.orders.length,
    totalSpent: customer.orders.reduce(
      (sum, order) =>
        sum +
        order.items.reduce((s, item) => s + item.price * item.quantity, 0),
      0
    ),
  }));

  const buffer = await buildSheet({
    sheetName: "회원목록",
    columns: [
      { header: "회원번호", key: "id", width: 10 },
      { header: "아이디", key: "loginId", width: 18 },
      { header: "이름", key: "name", width: 12 },
      { header: "연락처", key: "phone", width: 16 },
      { header: "우편번호", key: "zipcode", width: 10 },
      { header: "주소", key: "address", width: 40 },
      { header: "구분", key: "role", width: 10 },
      { header: "가입일", key: "createdAt", width: 16 },
      { header: "주문건수", key: "orderCount", width: 10 },
      { header: "누적구매액", key: "totalSpent", width: 14 },
    ],
    rows,
  });

  return xlsxResponse(buffer, "회원목록.xlsx", "customers.xlsx");
}
