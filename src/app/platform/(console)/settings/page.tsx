import type { Metadata } from "next";
import { requirePlatform } from "@/lib/access";
import { getPlatformSettings } from "@/lib/platformSettings";
import { PlatformSettingsForm } from "./PlatformSettingsForm";

export const metadata: Metadata = { title: "운영 방침" };

export default async function PlatformSettingsPage() {
  await requirePlatform();
  const settings = await getPlatformSettings();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold lg:text-2xl">운영 방침</h1>
        <p className="mt-1 text-sm text-zinc-500">
          모든 셀러에게 공통으로 적용되는 값이에요.
        </p>
      </div>

      <PlatformSettingsForm
        defaults={{
          acceptingApplications: settings.acceptingApplications,
          lowStockAtMin: String(settings.lowStockAtMin),
          lowStockAtMax: String(settings.lowStockAtMax),
          operatorContactKakaoUrl: settings.operatorContactKakaoUrl ?? "",
          operatorContactPhone: settings.operatorContactPhone ?? "",
        }}
      />
    </div>
  );
}
