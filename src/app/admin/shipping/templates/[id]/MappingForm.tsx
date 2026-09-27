"use client";

import { KeepValuesForm } from "@/components/KeepValuesForm";
import { FIELD_DEFS, type ColumnMapping } from "@/lib/courier";

export function MappingForm({
  action,
  template,
  headers,
  mapping,
}: {
  action: (formData: FormData) => void;
  template: { id: number; name: string; startRow: number; headerRow: number };
  headers: (string | undefined)[];
  mapping: ColumnMapping;
}) {
  return (
    <KeepValuesForm action={action} className="flex flex-col gap-4">
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
    </KeepValuesForm>
  );
}
