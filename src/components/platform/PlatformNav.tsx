"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function PlatformNav({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname();
  const items = [
    { href: "/platform", label: "홈" },
    { href: "/platform/applications", label: "셀러 신청", badge: pendingCount },
    { href: "/platform/sellers", label: "셀러" },
    { href: "/platform/audit", label: "기록" },
    { href: "/platform/settings", label: "운영 방침" },
  ];
  const isActive = (href: string) =>
    href === "/platform" ? pathname === "/platform" : pathname.startsWith(href);

  return (
    <nav className="flex gap-2 overflow-x-auto">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium ${
            isActive(item.href) ? "bg-white text-zinc-900" : "bg-white/10 text-white"
          }`}
        >
          {item.label}
          {item.badge ? (
            <span className="rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
              {item.badge}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
