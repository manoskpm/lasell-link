"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { updateProductAction } from "@/app/actions/products";

const CATEGORIES = ["의류", "악세서리", "잡화"];

export function ProductEditForm({
  product,
}: {
  product: {
    id: number;
    name: string;
    price: number;
    salePrice: number | null;
    cost: number;
    category: string;
    description: string | null;
    imageUrl: string | null;
    limitPerPerson: number;
  };
}) {
  const [state, formAction, pending] = useActionState(
    updateProductAction,
    null
  );
  const [preview, setPreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const router = useRouter();

  const shownImage = preview ?? (removeImage ? null : product.imageUrl);

  useEffect(() => {
    if (state && !state.error) router.refresh();
  }, [state, router]);

  return (
    <form action={formAction} className="card flex flex-col gap-4">
      <input type="hidden" name="productId" value={product.id} />
      <p className="text-sm font-semibold">상품 정보 수정</p>

      <div>
        <p className="label">상품 사진</p>
        <div className="flex items-start gap-3">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
            {shownImage ? (
              <Image
                src={shownImage}
                alt={product.name}
                width={200}
                height={200}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <span className="text-xs text-zinc-400">사진 없음</span>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <input
              name="image"
              type="file"
              accept="image/*"
              className="w-full text-sm"
              onChange={(event) => {
                const file = event.target.files?.[0];
                setPreview(file ? URL.createObjectURL(file) : null);
                if (file) setRemoveImage(false);
              }}
            />
            {product.imageUrl && !preview && (
              <label className="flex items-center gap-2 text-sm text-zinc-600">
                <input
                  type="checkbox"
                  name="removeImage"
                  checked={removeImage}
                  onChange={(event) => setRemoveImage(event.target.checked)}
                  className="h-4 w-4"
                />
                사진 삭제
              </label>
            )}
          </div>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="name">
          상품명
        </label>
        <input
          id="name"
          name="name"
          className="input"
          defaultValue={product.name}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
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
            className="input"
            defaultValue={product.price}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="salePrice">
            특가 (선택)
          </label>
          <input
            id="salePrice"
            name="salePrice"
            type="number"
            inputMode="numeric"
            min={0}
            className="input"
            defaultValue={product.salePrice ?? ""}
            placeholder="비우면 정가로 판매"
          />
        </div>
      </div>
      <p className="-mt-2 text-xs text-zinc-500">
        특가를 넣으면 손님 화면에 정가에 줄이 그어지고 할인율이 표시돼요.
      </p>

      <div className="grid grid-cols-2 gap-3">
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
            defaultValue={product.limitPerPerson || ""}
            placeholder="비우면 제한 없음"
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
            defaultValue={product.cost}
          />
        </div>
        <div>
          <label className="label" htmlFor="category">
            카테고리
          </label>
          <select
            id="category"
            name="category"
            className="input"
            defaultValue={product.category}
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
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
          defaultValue={product.description ?? ""}
        />
      </div>

      {state?.error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state && !state.error && (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          저장했어요.
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "저장 중..." : "상품 정보 저장"}
      </button>
    </form>
  );
}
