"use client";

import { useActionState, useState } from "react";
import { createOrderForCustomerAction } from "@/app/actions/orders";
import { optionLabel } from "@/lib/format";

type Customer = {
  id: number;
  name: string;
  phone: string;
  loginId: string;
  followed: boolean;
};
type Product = {
  id: number;
  name: string;
  isOpen: boolean;
  price: string;
  variants: { id: number; size: string | null; color: string | null; stock: number }[];
};

export function ProxyOrderForm({
  customers,
  products,
}: {
  customers: Customer[];
  products: Product[];
}) {
  const [state, formAction, pending] = useActionState(
    createOrderForCustomerAction,
    null
  );
  const [productId, setProductId] = useState(products[0]?.id ?? 0);
  const [done, setDone] = useState(0);

  const product = products.find((item) => item.id === productId);

  return (
    <form
      action={async (formData) => {
        formAction(formData);
        setDone((count) => count + 1);
      }}
      className="flex flex-col gap-4"
    >
      <div>
        <label className="label" htmlFor="userId">
          손님 *
        </label>
        <select id="userId" name="userId" className="input" required>
          <option value="">선택해주세요</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.followed ? "⭐ " : ""}
              {customer.name} ({customer.loginId}) · {customer.phone}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="productId">
          상품 *
        </label>
        <select
          id="productId"
          className="input"
          value={productId}
          onChange={(event) => setProductId(Number(event.target.value))}
        >
          {products.map((item) => (
            <option key={item.id} value={item.id}>
              {item.isOpen ? "🔴 " : ""}
              {item.name} · {item.price}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="variantId">
          옵션 *
        </label>
        <select id="variantId" name="variantId" className="input" required>
          {product?.variants.map((variant) => (
            <option key={variant.id} value={variant.id} disabled={variant.stock <= 0}>
              {optionLabel(variant.size, variant.color)} · 재고 {variant.stock}개
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="quantity">
          수량
        </label>
        <input
          id="quantity"
          name="quantity"
          type="number"
          min={1}
          defaultValue={1}
          className="input"
        />
      </div>

      <div>
        <label className="label" htmlFor="memo">
          메모
        </label>
        <input
          id="memo"
          name="memo"
          className="input"
          placeholder="예) 댓글 주문, 방송중 요청사항"
        />
      </div>

      {state?.error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}
      {!state?.error && done > 0 && !pending && (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          주문을 넣었어요. 손님 보관함에서 확인할 수 있어요.
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "주문 넣는 중..." : "대리주문 넣기"}
      </button>
    </form>
  );
}
