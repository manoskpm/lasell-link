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

      <div className="card flex flex-col gap-2">
        <h2 className="font-semibold">데이터 백업</h2>
        <p className="text-sm text-zinc-500">
          호스팅사의 자동 백업과는 별개로, 지금 상태를 파일 하나로 내려받아 따로
          보관할 수 있어요. 하루에 한 번 정도 눌러서 내 컴퓨터나 구글 드라이브 등에
          저장해두면 이중으로 안전해요.
        </p>
        <a href="/api/platform/backup" className="btn-secondary self-start">
          백업 파일 내려받기
        </a>
      </div>
    </div>
  );
}
