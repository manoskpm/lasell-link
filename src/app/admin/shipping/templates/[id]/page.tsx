import { requireOwnShop } from "@/lib/access";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  loadTemplateHeaders,
  saveTemplateAction,
} from "@/app/actions/courier";
import { FIELD_DEFS, parseMapping } from "@/lib/courier";
import { MappingForm } from "./MappingForm";
import { TemplateActions } from "./TemplateActions";

export default async function TemplateMappingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { shop } = await requireOwnShop();

  const { id } = await params;
  const loaded = await loadTemplateHeaders(Number(id));

  if (!loaded) notFound();

  const { template, headers } = loaded;
  const mapping = parseMapping(template.mapping);
  const detectedCount = FIELD_DEFS.filter(
    (def) => mapping[def.key] !== undefined
  ).length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold">{template.name}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          엑셀에서 찾은 칸 {headers.filter(Boolean).length}개 중 {detectedCount}
          개를 자동으로 연결했어요. 틀린 곳만 바꿔서 저장하면 다음부터 계속
          이대로 쓰여요.
        </p>
      </div>

      {!shop.senderAddress && (
        <Link
          href="/admin/settings"
          className="rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-700"
        >
          보내는분 주소가 아직 비어있어요. 설정에서 입력하면 송장 엑셀에 자동으로
          채워져요 →
        </Link>
      )}

      <MappingForm
        action={saveTemplateAction}
        template={template}
        headers={headers}
        mapping={mapping}
      />

      <TemplateActions
        templateId={template.id}
        isDefault={template.isDefault}
      />
    </div>
  );
}
