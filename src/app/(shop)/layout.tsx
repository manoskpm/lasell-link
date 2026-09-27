import type { Metadata } from "next";
import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { PresencePing } from "@/components/PresencePing";
import { ContactButton } from "@/components/ContactButton";
import { ShopLogo } from "@/components/ShopLogo";
import { getCartCount } from "@/app/actions/cart";
import { getAccess } from "@/lib/access";
import { getSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: settings.shopName,
    description: `${settings.shopName} 라이브 판매`,
  };
}

export default async function ShopLayout({ children }: LayoutProps<"/">) {
  const [access, settings] = await Promise.all([getAccess(), getSettings()]);
  const user = access.user;
  const cartCount = await getCartCount();

  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-[480px] bg-white pb-28">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 bg-white/95 px-4 py-3 backdrop-blur">
        <Link href="/" className="flex items-center">
          <ShopLogo logoUrl={settings.logoUrl} shopName={settings.shopName} />
        </Link>
        <div className="flex items-center gap-3 text-sm">
          {access.isPlatform ? (
            <Link href="/platform" className="chip bg-zinc-900 text-white">
              운영자
            </Link>
          ) : (
            access.canUseSellerConsole && (
              <Link href="/admin" className="chip bg-zinc-900 text-white">
                셀러 화면
              </Link>
            )
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
      <PresencePing />
      <BottomNav cartCount={cartCount} />
    </div>
  );
}
