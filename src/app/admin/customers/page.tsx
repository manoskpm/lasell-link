import Link from "next/link";
import { FollowToggle } from "@/components/FollowToggle";
import { formatDate } from "@/lib/format";
import { won } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; follow?: string }>;
}) {
  const { q, follow } = await searchParams;
  const keyword = q?.trim();
  const followOnly = follow === "1";

  const customers = await prisma.user.findMany({
    where: {
      ...(keyword
        ? {
            OR: [
              { name: { contains: keyword } },
              { loginId: { contains: keyword } },
              { phone: { contains: keyword } },
            ],
          }
        : {}),
      ...(followOnly ? { followedAt: { not: null } } : {}),
    },
    include: { orders: { include: { items: true } } },
    orderBy: [{ followedAt: "desc" }, { createdAt: "desc" }],
  });

  const followedCount = await prisma.user.count({
    where: { followedAt: { not: null } },
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold lg:text-2xl">회원</h1>
          <p className="mt-1 text-sm text-zinc-500">
            가입할 때 받은 이름·연락처·배송지가 저장돼요. 전체 목록은 엑셀로도
            내려받을 수 있어요.
          </p>
        </div>
        <a
          href="/api/admin/export/customers"
          className="chip bg-zinc-900 text-white"
        >
          엑셀 내려받기
        </a>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={keyword ? `/admin/customers?q=${keyword}` : "/admin/customers"}
          className={`chip ${!followOnly ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600"}`}
        >
          전체
        </Link>
        <Link
          href={`/admin/customers?follow=1${keyword ? `&q=${keyword}` : ""}`}
          className={`chip ${followOnly ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600"}`}
        >
          ⭐ 단골만 ({followedCount})
        </Link>
      </div>

      <form method="get" className="flex gap-2">
        {followOnly && <input type="hidden" name="follow" value="1" />}
        <input
          name="q"
          defaultValue={keyword ?? ""}
          placeholder="이름 · 아이디 · 연락처 검색"
          className="input max-w-xs"
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
        >
          검색
        </button>
      </form>

      <p className="text-sm text-zinc-500">총 {customers.length}명</p>

      {/* PC: 표 */}
      <div className="hidden overflow-x-auto rounded-2xl border border-zinc-200 bg-white lg:block">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs text-zinc-500">
            <tr>
              <th className="px-4 py-3">이름</th>
              <th className="px-4 py-3">아이디</th>
              <th className="px-4 py-3">연락처</th>
              <th className="px-4 py-3">배송지</th>
              <th className="px-4 py-3">가입일</th>
              <th className="px-4 py-3 text-right">주문</th>
              <th className="px-4 py-3 text-right">누적구매액</th>
              <th className="px-4 py-3">단골</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => {
              const totalSpent = customer.orders.reduce(
                (sum, order) =>
                  sum +
                  order.items.reduce(
                    (s, item) => s + item.price * item.quantity,
                    0
                  ),
                0
              );
              return (
                <tr key={customer.id} className="border-b border-zinc-100">
                  <td className="px-4 py-3 whitespace-nowrap font-medium">
                    {customer.name}
                    {customer.role === "ADMIN" && (
                      <span className="ml-1.5 chip bg-zinc-900 text-white">
                        관리자
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{customer.loginId}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-600">
                    {customer.phone}
                  </td>
                  <td className="max-w-[260px] px-4 py-3 text-xs text-zinc-500">
                    {customer.zipcode ? `[${customer.zipcode}] ` : ""}
                    {customer.address ?? "-"} {customer.addressDetail ?? ""}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-500">
                    {formatDate(customer.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {customer.orders.length}건
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {won(totalSpent)}
                  </td>
                  <td className="px-4 py-3">
                    {customer.role !== "ADMIN" && (
                      <FollowToggle
                        userId={customer.id}
                        followed={Boolean(customer.followedAt)}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 모바일: 카드 */}
      <div className="flex flex-col gap-3 lg:hidden">
        {customers.map((customer) => {
          const totalSpent = customer.orders.reduce(
            (sum, order) =>
              sum +
              order.items.reduce((s, item) => s + item.price * item.quantity, 0),
            0
          );
          return (
            <div key={customer.id} className="card flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-semibold">
                  {customer.followedAt && "⭐ "}
                  {customer.name}
                  <span className="ml-1 font-normal text-zinc-400">
                    {customer.loginId}
                  </span>
                </p>
                <span className="shrink-0 text-xs text-zinc-400">
                  {customer.orders.length}건 · {won(totalSpent)}
                </span>
              </div>
              <p className="text-xs text-zinc-500">{customer.phone}</p>
              <p className="text-xs text-zinc-500">
                {customer.zipcode ? `[${customer.zipcode}] ` : ""}
                {customer.address ?? "-"} {customer.addressDetail ?? ""}
              </p>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-xs text-zinc-400">
                  가입 {formatDate(customer.createdAt)}
                </p>
                {customer.role !== "ADMIN" && (
                  <FollowToggle
                    userId={customer.id}
                    followed={Boolean(customer.followedAt)}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {customers.length === 0 && (
        <p className="rounded-2xl border border-dashed border-zinc-200 bg-white py-14 text-center text-sm text-zinc-500">
          조건에 맞는 회원이 없어요.
        </p>
      )}
    </div>
  );
}
