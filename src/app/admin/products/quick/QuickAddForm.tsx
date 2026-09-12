"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { quickCreateProductAction } from "@/app/actions/products";

const CATEGORIES = ["의류", "악세서리", "잡화"];

export function QuickAddForm() {
  const [state, formAction, pending] = useActionState(
    quickCreateProductAction,
    null
  );
  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [addedCount, setAddedCount] = useState(0);
  const router = useRouter();

  // 등록에 성공하면 입력칸을 비우고 상품명으로 커서를 옮겨 바로 다음 상품을 넣게 함
  useEffect(() => {
    if (state && !state.error) {
      formRef.current?.reset();
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="price">
            판매가
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
