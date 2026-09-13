"use client";

import { useActionState, useMemo, useState } from "react";
import { createSettlementAction } from "@/app/actions/orders";
import { applyCoupon, couponLabel } from "@/lib/coupon";
import { optionLabel, won } from "@/lib/format";
import { calcShippingFeeByDay, dayTotals } from "@/lib/shipping";

type OrderRow = {
  id: number;
  createdAt: string;
  total: number;
  items: {
    id: number;
    productName: string;
    size: string | null;
    color: string | null;
    quantity: number;
  }[];
};

type CouponRow = {
  id: number;
  name: string;
  type: string;
  value: number;
  minAmount: number;
};

export function SettleForm({
  orders,
  coupons,
  shippingPolicy,
  defaults,
  bankAccount,
}: {
  orders: OrderRow[];
  coupons: CouponRow[];
  shippingPolicy: { shippingFee: number; freeShippingOver: number };
  defaults: {
    buyerName: string;
    buyerPhone: string;
    zipcode: string;
    address: string;
    addressDetail: string;
  };
  bankAccount: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    createSettlementAction,
    null
  );
  const [selected, setSelected] = useState<number[]>(orders.map((o) => o.id));
  const [couponId, setCouponId] = useState(0);

  const itemsTotal = useMemo(
    () =>
      orders
        .filter((order) => selected.includes(order.id))
        .reduce((sum, order) => sum + order.total, 0),
    [orders, selected]
  );

  const coupon = coupons.find((c) => c.id === couponId) ?? null;

  // 배송비는 '그날 보관함에 담긴 금액'으로 판정.
  // 라방에서 여러 번 나눠 사도 같은 날 합산액이 기준을 넘으면 무료배송
  const heldOrders = useMemo(
    () =>
      orders.map((order) => ({
        createdAt: new Date(order.createdAt),
        items: [{ price: order.total, quantity: 1 }],
      })),
    [orders]
  );
  const shipping = calcShippingFeeByDay({
    orders: heldOrders,
    shippingFee: shippingPolicy.shippingFee,
    freeShippingOver: shippingPolicy.freeShippingOver,
  });
  const baseShipping = shipping.fee;
  const perDay = useMemo(
    () => [...dayTotals(heldOrders).entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)),
    [heldOrders]
  );
  const untilFree =
    shippingPolicy.freeShippingOver > 0
      ? Math.max(0, shippingPolicy.freeShippingOver - shipping.bestDayTotal)
      : 0;
  const applied = applyCoupon({
    coupon: coupon
      ? { ...coupon, isActive: true, expiresAt: null }
      : null,
    itemsTotal,
    shippingFee: baseShipping,
  });
  const finalTotal = itemsTotal + applied.shippingFee - applied.discount;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <p className="text-sm font-semibold">받을 주문 고르기</p>
        {orders.map((order) => (
          <label
            key={order.id}
            className="flex items-start gap-3 rounded-2xl border border-zinc-200 p-3.5"
          >
            <input
              type="checkbox"
              name="orderIds"
              value={order.id}
              checked={selected.includes(order.id)}
              onChange={(event) =>
                setSelected((prev) =>
                  event.target.checked
                    ? [...prev, order.id]
                    : prev.filter((id) => id !== order.id)
                )
              }
              className="mt-0.5 h-5 w-5 shrink-0"
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">주문 #{order.id}</span>
                <span className="text-sm font-bold">{won(order.total)}</span>
              </span>
              {order.items.map((item) => (
                <span key={item.id} className="mt-0.5 block text-sm">
                  {item.productName}
                  <span className="text-zinc-400">
                    {" "}
                    · {optionLabel(item.size, item.color)} · {item.quantity}개
                  </span>
                </span>
              ))}
            </span>
          </label>
        ))}
      </section>

      {coupons.length > 0 && (
        <div>
          <label className="label" htmlFor="couponId">
            쿠폰
          </label>
          <select
            id="couponId"
            name="couponId"
            className="input"
            value={couponId}
            onChange={(event) => setCouponId(Number(event.target.value))}
          >
            <option value={0}>사용 안함</option>
            {coupons.map((item) => (
              <option key={item.id} value={item.id}>
                {couponLabel(item)}
              </option>
            ))}
          </select>
        </div>
      )}

      <section className="card flex flex-col gap-2">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">상품금액</span>
          <span>{won(itemsTotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">배송비</span>
          <span>
            {applied.shippingFee === 0 ? "무료" : won(applied.shippingFee)}
          </span>
        </div>
        {shippingPolicy.freeShippingOver > 0 && (
          <div className="rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
            <p>
              하루 {won(shippingPolicy.freeShippingOver)} 이상 사시면 배송비가
              무료예요. (그날 산 금액을 모두 합쳐서 계산)
            </p>
            {perDay.map(([day, total]) => (
              <p key={day} className="mt-0.5">
                {day} 누적 <b>{won(total)}</b>
                {total >= shippingPolicy.freeShippingOver ? (
                  <span className="ml-1 font-semibold text-emerald-600">
                    무료배송 적용
                  </span>
                ) : null}
              </p>
            ))}
            {untilFree > 0 && (
              <p className="mt-0.5 font-semibold text-zinc-800">
                {won(untilFree)} 더 담으면 무료배송이에요.
              </p>
            )}
          </div>
        )}
        {applied.discount > 0 && (
          <div className="flex justify-between text-sm text-red-500">
            <span>쿠폰 할인</span>
            <span>-{won(applied.discount)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-zinc-100 pt-2 font-bold">
          <span>총 결제금액</span>
          <span className="text-lg">{won(finalTotal)}</span>
        </div>
      </section>

      <p className="text-sm font-semibold">배송지</p>
      <div>
        <label className="label" htmlFor="buyerName">
          받는분 이름 *
        </label>
        <input
          id="buyerName"
          name="buyerName"
          className="input"
          defaultValue={defaults.buyerName}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="buyerPhone">
          연락처 *
        </label>
        <input
          id="buyerPhone"
          name="buyerPhone"
          type="tel"
          className="input"
          defaultValue={defaults.buyerPhone}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="zipcode">
          우편번호
        </label>
        <input
          id="zipcode"
          name="zipcode"
          inputMode="numeric"
          className="input"
          defaultValue={defaults.zipcode}
        />
      </div>
      <div>
        <label className="label" htmlFor="address">
          주소 *
        </label>
        <input
          id="address"
          name="address"
          className="input"
          defaultValue={defaults.address}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="addressDetail">
          상세주소
        </label>
        <input
          id="addressDetail"
          name="addressDetail"
          className="input"
          defaultValue={defaults.addressDetail}
        />
      </div>
      <div>
        <label className="label" htmlFor="memo">
          배송 요청사항
        </label>
        <textarea
          id="memo"
          name="memo"
          rows={2}
          className="input resize-none"
          placeholder="예) 부재시 문앞에 놔주세요"
        />
      </div>

      <div className="h-px bg-zinc-100" />
      <div>
        <label className="label" htmlFor="depositorName">
          입금자명
        </label>
        <input
          id="depositorName"
          name="depositorName"
          className="input"
          defaultValue={defaults.buyerName}
        />
        <p className="mt-1 text-xs text-zinc-500">
          통장에 찍히는 이름이 다르면 꼭 바꿔주세요.
        </p>
      </div>
      <input type="hidden" name="paymentMethod" value="계좌이체" />

      {bankAccount && (
        <p className="rounded-xl bg-zinc-50 px-3.5 py-3 text-sm text-zinc-600">
          입금계좌: <b className="text-zinc-900">{bankAccount}</b>
        </p>
      )}

      {state?.error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || selected.length === 0}
        className="btn-primary"
      >
        {pending ? "정산 중..." : `${selected.length}건 정산하고 배송받기`}
      </button>
    </form>
  );
}
