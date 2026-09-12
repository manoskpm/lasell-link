import Link from "next/link";
import { StatusChip } from "@/components/StatusChip";
import { TrackingImportForm } from "./TrackingImportForm";
import { itemLine } from "@/lib/courier";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function AdminShippingPage() {
  const [templates, orders] = await Promise.all([
    prisma.courierTemplate.findMany({ orderBy: [{ isDefault: "desc" }, { id: "asc" }] }),
    prisma.order.findMany({
      where: {
        paymentStatus: "입금완료",
        shippingStatus: { not: "발송완료" },
        canceledAt: null,
      },
      include: { items: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const defaultTemplate = templates.find((item) => item.isDefault) ?? templates[0];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">택배 · 송장</h1>
        <p className="mt-1 text-sm text-zinc-500">
          택배사 대량접수 엑셀 양식을 한 번 등록해두면, 주문을 골라 그 양식대로
          바로 내려받을 수 있어요.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">택배사 양식</h2>
          <Link
            href="/admin/shipping/templates/new"
            className="chip bg-zinc-900 text-white"
          >
            + 양식 등록
          </Link>
        </div>

        {templates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 p-5 text-sm text-zinc-500">
            <p className="font-medium text-zinc-700">
              등록된 양식이 없어요
            </p>
            <p className="mt-1">
              한진택배 홈페이지에서 받은 <b>대량접수(다량접수) 엑셀 양식</b>을
              그대로 올려주세요. 받는분·연락처·주소 같은 칸을 자동으로 찾아
              보여드릴게요.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {templates.map((template) => (
              <Link
                key={template.id}
                href={`/admin/shipping/templates/${template.id}`}
                className="flex items-center justify-between rounded-xl border border-zinc-200 px-3.5 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{template.name}</p>
                  <p className="text-xs text-zinc-400">
                    {template.sheetName} 시트 · {template.startRow}행부터 입력
                  </p>
                </div>
                {template.isDefault && (
                  <span className="chip bg-zinc-900 text-white">기본</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">
          접수할 주문 ({orders.length}건)
        </h2>
        <p className="text-xs text-zinc-500">
          입금완료된 주문만 나와요. 체크된 주문이 엑셀로 만들어지고, 내려받으면
          배송상태가 &apos;접수완료&apos;로 바뀌어요.
        </p>

        {orders.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-200 py-10 text-center text-sm text-zinc-500">
            접수할 주문이 없어요.
          </p>
        ) : (
          <form
            action="/api/shipping/export"
            method="post"
            className="flex flex-col gap-3"
          >
            {templates.length > 1 ? (
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">사용할 양식</span>
                <select
                  name="templateId"
                  className="input"
                  defaultValue={defaultTemplate?.id}
                >
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <input
                type="hidden"
                name="templateId"
                value={defaultTemplate?.id ?? ""}
              />
            )}

            <div className="flex flex-col gap-2">
              {orders.map((order) => (
                <label
                  key={order.id}
                  className="flex items-start gap-3 rounded-xl border border-zinc-200 px-3.5 py-3"
                >
                  <input
                    type="checkbox"
                    name="orderIds"
                    value={order.id}
                    defaultChecked
                    className="mt-1 h-5 w-5 shrink-0"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">
                        #{order.id} {order.buyerName}
                      </span>
                      <StatusChip status={order.shippingStatus} />
                    </span>
                    <span className="mt-0.5 block text-xs text-zinc-500">
                      {order.buyerPhone} · {formatDate(order.createdAt)}
                    </span>
                    <span className="mt-0.5 block text-xs text-zinc-500">
                      {order.zipcode ? `[${order.zipcode}] ` : ""}
                      {order.address} {order.addressDetail ?? ""}
                    </span>
                    <span className="mt-1 block border-t border-zinc-100 pt-1">
                      {order.items.map((item) => (
                        <span
                          key={item.id}
                          className="block text-xs font-medium text-zinc-700"
                        >
                          {itemLine(item)}
                        </span>
                      ))}
                    </span>
                  </span>
                </label>
              ))}
            </div>

            <button
              type="submit"
              disabled={templates.length === 0}
              className="btn-primary"
            >
              선택한 주문 엑셀로 내려받기
            </button>
            {templates.length === 0 && (
              <p className="text-center text-xs text-zinc-500">
                양식을 먼저 등록해주세요.
              </p>
            )}
          </form>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">운송장번호 받아오기</h2>
        <p className="text-xs text-zinc-500">
          택배사에 접수하고 받은 엑셀(운송장번호가 채워진 파일)을 올리면, 주문에
          운송장번호가 저장되고 배송상태가 &apos;발송완료&apos;로 바뀌어요.
        </p>
        <TrackingImportForm />
      </section>
    </div>
  );
}
