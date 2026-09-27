import type { Metadata } from "next";
import Link from "next/link";
import { AdminSidebar, AdminTabs } from "@/components/AdminNav";
import { AppLogoMark } from "@/components/AppLogo";
import { ShopLogo } from "@/components/ShopLogo";
import { APP_NAME } from "@/lib/app";
import { getAccess, requireOwnShop } from "@/lib/access";
import { getStorefrontShop } from "@/lib/shop";

export async function generateMetadata(): Promise<Metadata> {
  const shop = await getStorefrontShop();
  return { title: `${APP_NAME} 관리자${shop ? ` · ${shop.name}` : ""}` };
}

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { user: admin, shop } = await requireOwnShop();
  const { isPlatform } = await getAccess();

  return (
    <div className="min-h-dvh bg-zinc-50">
      {isPlatform && (
        <div className="bg-zinc-900 px-4 py-1.5 text-center text-xs text-white">
          운영자로 보는 중이에요 · 여기서 바꾸는 내용은 셀러 상점에 그대로
          반영돼요{" "}
          <Link href="/platform" className="ml-2 font-semibold underline">
            운영자 화면으로
          </Link>
        </div>
      )}
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 px-4 pb-2 pt-3 backdrop-blur lg:px-8 lg:pb-3">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <AppLogoMark size={34} />
              <div>
                <p className="text-[11px] font-medium text-zinc-400">
                  {APP_NAME} 관리자
                </p>
                <ShopLogo
                  logoUrl={shop.logoUrl}
                  shopName={shop.name}
                  height={24}
                  textClassName="text-base font-bold"
                />
              </div>
            </div>
            {shop.courier?.siteUrl && (
              <Link
                href={shop.courier.siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden chip bg-zinc-100 text-zinc-700 lg:inline-block"
              >
                {shop.courier.name} 접수사이트
                {shop.courierLoginId ? ` (${shop.courierLoginId})` : ""}
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-zinc-400">{admin.name}</span>
            <Link href="/" className="chip bg-zinc-100 text-zinc-700">
              쇼핑몰 보기
            </Link>
          </div>
        </div>
        <div className="mx-auto mt-3 max-w-[1400px]">
          <AdminTabs />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] gap-8 px-4 py-5 lg:px-8 lg:py-8">
        <AdminSidebar />
        <main className="min-w-0 flex-1 pb-16">{children}</main>
      </div>
    </div>
  );
}
