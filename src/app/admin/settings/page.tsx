import { requireOwnShop } from "@/lib/access";
import { formatDate } from "@/lib/format";
import { getPlatformSettings } from "@/lib/platformSettings";
import { prisma } from "@/lib/prisma";
import { NotifyKeyCard } from "./NotifyKeyCard";
import { SettingsForm } from "./SettingsForm";

export default async function AdminSettingsPage() {
  const { shop } = await requireOwnShop();

  const [couriers, platformSettings] = await Promise.all([
    prisma.courier.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    getPlatformSettings(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">설정</h1>
        <p className="mt-1 text-sm text-zinc-500">
          여기서 바꾼 상호명과 문의 링크가 손님 화면에 바로 반영돼요.
        </p>
      </div>
      <SettingsForm
        logoUrl={shop.logoUrl}
        couriers={couriers.map((c) => ({ id: c.id, name: c.name, siteUrl: c.siteUrl, trackingUrlTemplate: c.trackingUrlTemplate }))}
        lowStockAtRange={{
          min: platformSettings.lowStockAtMin,
          max: platformSettings.lowStockAtMax,
        }}
        defaults={{
          shopName: shop.name,
          ownerName: shop.ownerName ?? "",
          contactPhone: shop.contactPhone ?? "",
          kakaoChannelUrl: shop.kakaoChannelUrl ?? "",
          chatUrl: shop.chatUrl ?? "",
          bankAccount: shop.bankAccount ?? "",
          noticeText: shop.noticeText ?? "",
          senderZipcode: shop.senderZipcode ?? "",
          senderAddress: shop.senderAddress ?? "",
          senderAddressDetail: shop.senderAddressDetail ?? "",
          courierId: shop.courierId ? String(shop.courierId) : "",
          courierLoginId: shop.courierLoginId ?? "",
          courierCustomerCode: shop.courierCustomerCode ?? "",
          shippingFee: String(shop.shippingFee),
          freeShippingOver: String(shop.freeShippingOver),
          courierCost: String(shop.courierCost),
          lowStockAt: String(shop.lowStockAt),
          paymentDueRule: shop.paymentDueRule,
          paymentDueHours: String(shop.paymentDueHours),
          paymentDueFixedTime: shop.paymentDueFixedTime ?? "18:00",
        }}
      />
      <NotifyKeyCard
        hasKey={Boolean(shop.notifySecretHash)}
        issuedAtLabel={shop.notifySecretIssuedAt ? formatDate(shop.notifySecretIssuedAt) : null}
      />
    </div>
  );
}
