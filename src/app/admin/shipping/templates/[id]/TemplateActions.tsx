"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  deleteTemplateAction,
  setDefaultTemplateAction,
} from "@/app/actions/courier";

export function TemplateActions({
  templateId,
  isDefault,
}: {
  templateId: number;
  isDefault: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-col gap-2">
      {!isDefault && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await setDefaultTemplateAction(templateId);
              router.refresh();
            })
          }
          className="btn-secondary"
        >
          기본 양식으로 지정
        </button>
      )}

      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm("이 양식을 삭제할까요?")) return;
          startTransition(() => deleteTemplateAction(templateId));
        }}
        className="w-full py-3 text-sm text-red-500"
      >
        양식 삭제
      </button>
    </div>
  );
}
