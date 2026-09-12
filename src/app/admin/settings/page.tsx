import { getSettings } from "@/lib/settings";
import { SettingsForm } from "./SettingsForm";

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">설정</h1>
        <p className="mt-1 text-sm text-zinc-500">
          여기서 바꾼 상호명과 문의 링크가 손님 화면에 바로 반영돼요.
        </p>
      </div>
      <SettingsForm
        logoUrl={settings.logoUrl}
        defaults={{
          shopName: settings.shopName,
          ownerName: settings.ownerName ?? "",
          contactPhone: settings.contactPhone ?? "",
          kakaoChannelUrl: settings.kakaoChannelUrl ?? "",
          chatUrl: settings.chatUrl ?? "",
          bankAccount: settings.bankAccount ?? "",
          noticeText: settings.noticeText ?? "",
          senderZipcode: settings.senderZipcode ?? "",
          senderAddress: settings.senderAddress ?? "",
          senderAddressDetail: settings.senderAddressDetail ?? "",
          courierName: settings.courierName ?? "",
          courierSiteUrl: settings.courierSiteUrl ?? "",
          courierLoginId: settings.courierLoginId ?? "",
          courierCustomerCode: settings.courierCustomerCode ?? "",
          trackingUrlTemplate: settings.trackingUrlTemplate ?? "",
        }}
      />
    </div>
  );
}
