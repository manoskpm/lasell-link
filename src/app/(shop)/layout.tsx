import type { Metadata } from "next";
import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { ContactButton } from "@/components/ContactButton";
import { ShopLogo } from "@/components/ShopLogo";
import { getCartCount } from "@/app/actions/cart";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: settings.shopName,
    description: `${settings.shopName} 라이브 판매`,
  };
}

export default async function ShopLayout({ children }: LayoutProps<"/">) {
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);
  const cartCount = user ? await getCartCount(user.id) : 0;

  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-[480px] bg-white pb-28">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 bg-white/95 px-4 py-3 backdrop-blur">
        <Link href="/" className="flex items-center">
          <ShopLogo logoUrl={settings.logoUrl} shopName={settings.shopName} />
        </Link>
        <div className="flex items-center gap-3 text-sm">
          {user?.role === "ADMIN" && (
            <Link href="/admin" className="chip bg-zinc-900 text-white">
              관리자
            </Link>
          )}
          {user ? (
            <span className="text-zinc-500">{user.name}님</span>
          ) : (
            <Link href="/login" className="font-medium text-zinc-900">
              로그인
            </Link>
          )}
        </div>
      </header>

      <main className="px-4 py-4">{children}</main>

      <ContactButton
        kakaoChannelUrl={settings.kakaoChannelUrl}
        chatUrl={settings.chatUrl}
      />
      <BottomNav cartCount={cartCount} />
    </div>
  );
}
