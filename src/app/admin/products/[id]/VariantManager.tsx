"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addVariantAction, deleteVariantAction } from "@/app/actions/products";
import { optionLabel } from "@/lib/format";

type Variant = {
  id: number;
  size: string | null;
  color: string | null;
  stock: number;
};

export function VariantManager({
  productId,
  variants,
}: {
  productId: number;
  variants: Variant[];
}) {
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [stock, setStock] = useState("10");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run(action: () => Promise<{ error?: string } | { ok: boolean }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="card flex flex-col gap-4">
      <div>
        <p className="text-sm font-semibold">옵션 관리</p>
        <p className="mt-1 text-xs text-zinc-500">
          사이즈·색상을 나중에 추가하거나 지울 수 있어요. 재고 수정은 아래
          &apos;옵션별 재고&apos;에서 하면 돼요.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {variants.map((variant) => (
          <div
            key={variant.id}
            className="flex items-center justify-between rounded-xl border border-zinc-200 px-3.5 py-2.5"
          >
            <span className="text-sm">
              {optionLabel(variant.size, variant.color)}
              <span className="ml-2 text-xs text-zinc-400">
                재고 {variant.stock}개
              </span>
            </span>
            <button
              type="button"
              disabled={pending || variants.length <= 1}
              onClick={() => {
                if (!confirm("이 옵션을 삭제할까요?")) return;
                run(() => deleteVariantAction(variant.id));
              }}
              className="text-xs text-zinc-400 hover:text-red-500 disabled:opacity-40"
            >
              삭제
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 rounded-xl bg-zinc-50 p-3">
        <p className="text-xs font-medium text-zinc-600">옵션 추가</p>
        <div className="grid grid-cols-3 gap-2">
          <input
            value={size}
            onChange={(event) => setSize(event.target.value)}
            placeholder="사이즈"
            className="input"
          />
          <input
            value={color}
            onChange={(event) => setColor(event.target.value)}
            placeholder="색상"
            className="input"
          />
          <input
            value={stock}
            onChange={(event) => setStock(event.target.value)}
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="재고"
            className="input"
          />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!size.trim() && !color.trim()) {
              setError("사이즈나 색상 중 하나는 입력해주세요.");
              return;
            }
            run(async () => {
              const result = await addVariantAction(
                productId,
                size,
                color,
                Number(stock) || 0
              );
              if (!result.error) {
                setSize("");
                setColor("");
              }
              return result;
            });
          }}
          className="btn-secondary"
        >
          {pending ? "처리 중..." : "옵션 추가"}
        </button>
      </div>
    </div>
  );
}
