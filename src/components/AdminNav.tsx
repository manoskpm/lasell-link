"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlatformStrip } from "./AppLogo";

const ITEMS = [
  { href: "/admin", label: "홈", desc: "오늘 현황" },
  { href: "/admin/live", label: "라이브", desc: "상품 오픈" },
  { href: "/admin/products", label: "상품", desc: "등록 · 재고" },
  { href: "/admin/orders", label: "주문", desc: "매출 · 배송대기" },
  { href: "/admin/settlements", label: "정산", desc: "합배송 · 발송" },
  { href: "/admin/coupons", label: "쿠폰", desc: "발행 · 관리" },
  { href: "/admin/finance", label: "장부", desc: "수입 · 지출" },
  { href: "/admin/shipping", label: "택배", desc: "접수 · 송장" },
  { href: "/admin/customers", label: "회원", desc: "고객 정보" },
  { href: "/admin/settings", label: "설정", desc: "상점 정보" },
];

function useActiveHref() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

/// 모바일용 상단 가로 탭
export function AdminTabs() {
  const isActive = useActiveHref();

  return (
    <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
            isActive(item.href)
              ? "bg-zinc-900 text-white"
              : "bg-zinc-100 text-zinc-600"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

/// PC용 좌측 사이드바
export function AdminSidebar() {
  const isActive = useActiveHref();

  return (
    <nav className="hidden w-56 shrink-0 flex-col gap-1 self-start lg:flex">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`rounded-xl px-3.5 py-2.5 ${
            isActive(item.href)
              ? "bg-zinc-900 text-white"
              : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          <span className="block text-sm font-semibold">{item.label}</span>
          <span
            className={`block text-xs ${
              isActive(item.href) ? "text-zinc-300" : "text-zinc-400"
            }`}
          >
            {item.desc}
          </span>
        </Link>
      ))}

      <div className="mt-6 border-t border-zinc-200 pt-4">
        <PlatformStrip />
      </div>
    </nav>
  );
}
