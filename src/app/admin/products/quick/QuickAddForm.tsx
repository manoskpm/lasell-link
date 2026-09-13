"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { quickCreateProductAction } from "@/app/actions/products";

const CATEGORIES = ["의류", "악세서리", "잡화"];
const SIZE_PRESETS = ["FREE", "S,M,L", "S,M,L,XL"];
const COLOR_PRESETS = ["블랙,아이보리", "블랙,화이트,베이지"];

export function QuickAddForm() {
  const [state, formAction, pending] = useActionState(
    quickCreateProductAction,
    null
  );
  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [addedCount, setAddedCount] = useState(0);
  const [sizes, setSizes] = useState("");
  const [colors, setColors] = useState("");
  const [photoName, setPhotoName] = useState<string | null>(null);
  const router = useRouter();

  // 등록에 성공하면 입력칸을 비우고 상품명으로 커서를 옮겨 바로 다음 상품을 넣게 함
  useEffect(() => {
    if (state && !state.error) {
      formRef.current?.reset();
      setSizes("");
      setColors("");
      setPhotoName(null);
      nameRef.current?.focus();
      setAddedCount((count) => count + 1);
      router.refresh();
    }
  }, [state, router]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4"
    >
      <div>
        <label className="label" htmlFor="name">
          상품명
        </label>
        <input
          ref={nameRef}
          id="name"
          name="name"
          className="input text-lg"
          placeholder="예) 뽀글이 후드집업"
          autoComplete="off"
          required
          autoFocus
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label" htmlFor="price">
            정가
          </label>
          <input
            id="price"
            name="price"
            type="number"
            inputMode="numeric"
            min={0}
            className="input text-lg"
            placeholder="39000"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="salePrice">
            특가
          </label>
          <input
            id="salePrice"
            name="salePrice"
            type="number"
            inputMode="numeric"
            min={0}
            className="input text-lg"
            placeholder="선택"
          />
        </div>
        <div>
          <label className="label" htmlFor="limitPerPerson">
            1인당 구매제한
          </label>
          <input
            id="limitPerPerson"
            name="limitPerPerson"
            type="number"
            inputMode="numeric"
            min={0}
            className="input"
            placeholder="비우면 제한 없음"
          />
        </div>
        <div>
          <label className="label" htmlFor="stock">
            재고
          </label>
          <input
            id="stock"
            name="stock"
            type="number"
            inputMode="numeric"
            min={0}
            defaultValue={10}
            className="input text-lg"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="image"
          className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 py-4 text-sm font-medium text-zinc-600 active:bg-zinc-50"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="M3 8.5h3.2l1.4-2h8.8l1.4 2H21v11H3z" />
            <circle cx="12" cy="14" r="3.6" />
          </svg>
          {photoName ? `사진 선택됨 (${photoName})` : "사진 찍기 / 고르기"}
        </label>
        <input
          id="image"
          name="image"
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(event) =>
            setPhotoName(event.target.files?.[0]?.name ?? null)
          }
        />
        <p className="mt-1 text-xs text-zinc-500">
          폰에서 누르면 카메라가 바로 열려요. 없어도 등록은 되지만, 손님 화면에
          사진이 안 보여요.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="sizes">
          사이즈 (선택)
        </label>
        <input
          id="sizes"
          name="sizes"
          className="input"
          value={sizes}
          onChange={(event) => setSizes(event.target.value)}
          placeholder="비우면 옵션 없음"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {SIZE_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setSizes(sizes === preset ? "" : preset)}
              className={`chip ${
                sizes === preset
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-600"
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="colors">
          색상 (선택)
        </label>
        <input
          id="colors"
          name="colors"
          className="input"
          value={colors}
          onChange={(event) => setColors(event.target.value)}
          placeholder="비우면 옵션 없음"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setColors(colors === preset ? "" : preset)}
              className={`chip ${
                colors === preset
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-600"
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="category">
          카테고리
        </label>
        <select id="category" name="category" className="input">
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {state?.error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}

      {addedCount > 0 && !state?.error && (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          등록했어요! (이번 방송 {addedCount}개째) 바로 다음 상품을 입력하세요.
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary text-lg">
        {pending ? "등록 중..." : "등록하고 계속"}
      </button>
    </form>
  );
}
