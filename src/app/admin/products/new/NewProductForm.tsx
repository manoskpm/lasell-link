"use client";

import { useActionState, useState } from "react";
import { createProductAction } from "@/app/actions/products";

const CATEGORIES = ["의류", "악세서리", "잡화"];
const SIZE_PRESETS = ["FREE", "S,M,L", "S,M,L,XL", "44,55,66"];
const COLOR_PRESETS = ["블랙,아이보리", "블랙,화이트,베이지"];

export function NewProductForm() {
  const [state, formAction, pending] = useActionState(
    createProductAction,
    null
  );
  const [sizes, setSizes] = useState("");
  const [colors, setColors] = useState("");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className="label" htmlFor="name">
          상품명 *
        </label>
        <input
          id="name"
          name="name"
          className="input"
          placeholder="예) 뽀글이 크롭 후드집업"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="price">
            판매가 *
          </label>
          <input
            id="price"
            name="price"
            type="number"
            inputMode="numeric"
            min={0}
            className="input"
            placeholder="29000"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="cost">
            원가 (정산용)
          </label>
          <input
            id="cost"
            name="cost"
            type="number"
            inputMode="numeric"
            min={0}
            className="input"
            placeholder="12000"
          />
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

      <div className="h-px bg-zinc-100" />
      <div>
        <p className="text-sm font-semibold">옵션 (사이즈 · 색상)</p>
        <p className="mt-1 text-xs text-zinc-500">
          쉼표(,)로 구분해서 적으면 조합별로 재고가 자동 생성돼요. 예) 사이즈
          S,M,L + 색상 블랙,아이보리 → 6개 옵션
        </p>
      </div>

      <div>
        <label className="label" htmlFor="sizes">
          사이즈
        </label>
        <input
          id="sizes"
          name="sizes"
          className="input"
          value={sizes}
          onChange={(event) => setSizes(event.target.value)}
          placeholder="비워두면 사이즈 옵션 없음"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {SIZE_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setSizes(preset)}
              className="chip bg-zinc-100 text-zinc-600"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="colors">
          색상
        </label>
        <input
          id="colors"
          name="colors"
          className="input"
          value={colors}
          onChange={(event) => setColors(event.target.value)}
          placeholder="비워두면 색상 옵션 없음"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setColors(preset)}
              className="chip bg-zinc-100 text-zinc-600"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="stock">
          옵션별 재고 수량
        </label>
        <input
          id="stock"
          name="stock"
          type="number"
          inputMode="numeric"
          min={0}
          defaultValue={10}
          className="input"
        />
        <p className="mt-1 text-xs text-zinc-500">
          등록 후 옵션별로 재고를 따로 수정할 수 있어요.
        </p>
      </div>

      <div className="h-px bg-zinc-100" />

      <div>
        <label className="label" htmlFor="image">
          상품 사진
        </label>
        <input
          id="image"
          name="image"
          type="file"
          accept="image/*"
          className="w-full text-sm"
        />
      </div>

      <div>
        <label className="label" htmlFor="description">
          상품 설명
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="input resize-none"
          placeholder="소재, 실측 사이즈, 세탁방법 등"
        />
      </div>

      {state?.error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "등록 중..." : "상품 등록하기"}
      </button>
    </form>
  );
}
