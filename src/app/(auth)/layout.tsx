import Link from "next/link";
import { AppLogo, PlatformStrip } from "@/components/AppLogo";
import { APP_NAME_EN } from "@/lib/app";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-white px-5 py-10">
      <div className="flex flex-col items-center gap-3">
        <Link href="/" className="flex items-center">
          <AppLogo size={40} className="text-2xl font-bold tracking-tight" />
        </Link>
        <p className="text-xs font-semibold tracking-wide text-zinc-400">
          {APP_NAME_EN}
        </p>
        <PlatformStrip />
      </div>

      <div className="mt-10">{children}</div>
    </div>
  );
}
