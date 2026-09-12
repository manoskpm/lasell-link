import Link from "next/link";
import { notFound } from "next/navigation";
import {
  loadTemplateHeaders,
  saveTemplateAction,
} from "@/app/actions/courier";
import { FIELD_DEFS, parseMapping } from "@/lib/courier";
import { getSettings } from "@/lib/settings";
import { TemplateActions } from "./TemplateActions";

export default async function TemplateMappingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [loaded, settings] = await Promise.all([
    loadTemplateHeaders(Number(id)),
    getSettings(),
  ]);

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

      {!settings.senderAddress && (
        <Link
          href="/admin/settings"
          className="rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-700"
        >
          보내는분 주소가 아직 비어있어요. 설정에서 입력하면 송장 엑셀에 자동으로
          채워져요 →
        </Link>
      )}

      <form action={saveTemplateAction} className="flex flex-col gap-4">
        <input type="hidden" name="templateId" value={template.id} />

        <div>
          <label className="label" htmlFor="name">
            양식 이름
          </label>
          <input
            id="name"
            name="name"
            className="input"
            defaultValue={template.name}
          />
        </div>

        <div>
          <label className="label" htmlFor="startRow">
            데이터가 시작될 행
          </label>
          <input
            id="startRow"
            name="startRow"
            type="number"
            min={1}
            className="input"
            defaultValue={template.startRow}
          />
          <p className="mt-1 text-xs text-zinc-500">
            제목줄이 {template.headerRow}행이라 보통 {template.headerRow + 1}
            행부터 입력해요. 양식에 예시 데이터가 있으면 그 아래 행 번호로
            바꿔주세요.
          </p>
        </div>

        <div className="h-px bg-zinc-100" />
        <p className="text-sm font-semibold">칸 연결</p>

        <div className="flex flex-col gap-3">
          {FIELD_DEFS.map((def) => {
            const selected = mapping[def.key] ?? 0;
            return (
              <label key={def.key} className="flex flex-col gap-1 text-sm">
                <span className="flex items-center gap-2">
                  <span className="font-medium">{def.label}</span>
                  {selected === 0 && (
                    <span className="chip bg-zinc-100 text-zinc-500">
                      연결 안됨
                    </span>
                  )}
                </span>
                <select
                  name={`field_${def.key}`}
                  className="input"
                  defaultValue={selected}
                >
                  <option value={0}>사용 안함</option>
                  {headers.map((header, index) =>
                    header ? (
                      <option key={index} value={index + 1}>
                        {index + 1}열 · {header}
                      </option>
                    ) : null
                  )}
                </select>
              </label>
            );
          })}
        </div>

        <button type="submit" className="btn-primary">
          이대로 저장
        </button>
      </form>

      <TemplateActions
        templateId={template.id}
        isDefault={template.isDefault}
      />
    </div>
  );
}
