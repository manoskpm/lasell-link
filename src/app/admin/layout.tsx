import type { Metadata } from "next";
import Link from "next/link";
import { AdminSidebar, AdminTabs } from "@/components/AdminNav";
import { AppLogoMark } from "@/components/AppLogo";
import { ShopLogo } from "@/components/ShopLogo";
import { APP_NAME } from "@/lib/app";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return { title: `${APP_NAME} 관리자 · ${settings.shopName}` };
}

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();
  const settings = await getSettings();

  return (
    <div className="min-h-dvh bg-zinc-50">
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
                  logoUrl={settings.logoUrl}
                  shopName={settings.shopName}
                  height={24}
                  textClassName="text-base font-bold"
                />
              </div>
            </div>
            {settings.courierSiteUrl && (
              <Link
                href={settings.courierSiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden chip bg-zinc-100 text-zinc-700 lg:inline-block"
              >
                {settings.courierName ?? "택배사"} 접수사이트
                {settings.courierLoginId ? ` (${settings.courierLoginId})` : ""}
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
