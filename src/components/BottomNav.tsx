"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "홈", icon: HomeIcon },
  { href: "/cart", label: "장바구니", icon: CartIcon },
  { href: "/my/orders", label: "주문내역", icon: ReceiptIcon },
  { href: "/my", label: "내정보", icon: UserIcon },
];

export function BottomNav({ cartCount }: { cartCount: number }) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-[480px] -translate-x-1/2 border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-4">
        {ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${
                active ? "text-zinc-900" : "text-zinc-400"
              }`}
            >
              <span className="relative">
                <Icon />
                {item.href === "/cart" && cartCount > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {cartCount}
                  </span>
                )}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 6h16l-1.5 10.5a2 2 0 0 1-2 1.7H7.5a2 2 0 0 1-2-1.7L4 6z" />
      <path d="M8.5 6V4.5a3.5 3.5 0 0 1 7 0V6" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 3h14v18l-3-2-2 2-2-2-2 2-3-2z" />
      <path d="M9 8h6M9 12h6" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
    </svg>
  );
}
