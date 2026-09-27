"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { updateSettingsAction } from "@/app/actions/settings";
import { KeepValuesForm } from "@/components/KeepValuesForm";

type Courier = {
  id: number;
  name: string;
  siteUrl: string | null;
  trackingUrlTemplate: string | null;
};

export function SettingsForm({
  defaults,
  logoUrl,
  couriers,
  lowStockAtRange,
}: {
  defaults: {
    shopName: string;
    ownerName: string;
    contactPhone: string;
    kakaoChannelUrl: string;
    chatUrl: string;
    bankAccount: string;
    noticeText: string;
    senderZipcode: string;
    senderAddress: string;
    senderAddressDetail: string;
    courierId: string;
    courierLoginId: string;
    courierCustomerCode: string;
    shippingFee: string;
    freeShippingOver: string;
    courierCost: string;
    lowStockAt: string;
    paymentDueRule: string;
    paymentDueHours: string;
    paymentDueFixedTime: string;
  };
  logoUrl: string | null;
  couriers: Courier[];
  lowStockAtRange: { min: number; max: number };
}) {
  const [state, formAction, pending] = useActionState(
    updateSettingsAction,
    null
  );
  const [preview, setPreview] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [courierId, setCourierId] = useState(defaults.courierId);
  const [bankAccount, setBankAccount] = useState(defaults.bankAccount);
  const [paymentDueRule, setPaymentDueRule] = useState(defaults.paymentDueRule);

  const shownLogo = preview ?? (removeLogo ? null : logoUrl);
  const selectedCourier = couriers.find((c) => String(c.id) === courierId);
  const bankAccountChanged = bankAccount !== defaults.bankAccount;
  const errorField = state?.field;

  return (
    <KeepValuesForm action={formAction} className="flex flex-col gap-4">
      <div>
        <p className="label">상점 로고</p>
        <div className="flex items-center gap-3">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
            {shownLogo ? (
              <Image
                src={shownLogo}
                alt="상점 로고"
                width={160}
                height={160}
                className="h-full w-full object-contain"
                unoptimized
              />
            ) : (
              <span className="text-xs text-zinc-400">로고 없음</span>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <input
              id="logo"
              name="logo"
              type="file"
              accept="image/*"
              className="w-full text-sm"
              onChange={(event) => {
                const file = event.target.files?.[0];
                setPreview(file ? URL.createObjectURL(file) : null);
                if (file) setRemoveLogo(false);
              }}
            />
            <p className="text-xs text-zinc-500">
              가로로 긴 이미지(예: 400×120)나 정사각형 로고 모두 괜찮아요. 투명
              배경 PNG를 쓰면 제일 깔끔해요.
            </p>
            {logoUrl && !preview && (
              <label className="flex items-center gap-2 text-sm text-zinc-600">
                <input
                  type="checkbox"
                  name="removeLogo"
                  checked={removeLogo}
                  onChange={(event) => setRemoveLogo(event.target.checked)}
                  className="h-4 w-4"
                />
                로고 삭제하고 상호명만 표시
              </label>
            )}
          </div>
        </div>
      </div>

      <div className="h-px bg-zinc-100" />

      <Field id="shopName" label="상호 (브랜드명) *" error={errorField === "shopName" ? state?.error : undefined}>
        <input
          id="shopName"
          name="shopName"
          className="input"
          defaultValue={defaults.shopName}
          required
        />
        <p className="mt-1 text-xs text-zinc-500">
          브라우저 탭 제목에 쓰이고, 로고가 없을 때 손님 화면 상단에 표시돼요.
        </p>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="ownerName">
            대표자명
          </label>
          <input
            id="ownerName"
            name="ownerName"
            className="input"
            defaultValue={defaults.ownerName}
          />
        </div>
        <div>
          <label className="label" htmlFor="contactPhone">
            대표 연락처
          </label>
          <input
            id="contactPhone"
            name="contactPhone"
            type="tel"
            className="input"
            defaultValue={defaults.contactPhone}
          />
        </div>
      </div>

      <div className="h-px bg-zinc-100" />
      <p className="text-sm font-semibold">문의 버튼 연동</p>

      <Field id="kakaoChannelUrl" label="카카오채널 링크" error={errorField === "kakaoChannelUrl" ? state?.error : undefined}>
        <input
          id="kakaoChannelUrl"
          name="kakaoChannelUrl"
          type="url"
          className="input"
          defaultValue={defaults.kakaoChannelUrl}
          placeholder="http://pf.kakao.com/_xxxxxxx"
        />
        <p className="mt-1 text-xs text-zinc-500">
          카카오톡 채널 관리자센터 → 채널 홈 URL을 그대로 붙여넣으면 돼요.
        </p>
      </Field>

      <div>
        <label className="label" htmlFor="chatUrl">
          기타 채팅 링크 (오픈채팅 등)
        </label>
        <input
          id="chatUrl"
          name="chatUrl"
          type="url"
          className="input"
          defaultValue={defaults.chatUrl}
          placeholder="https://open.kakao.com/o/xxxxxxx"
        />
        <p className="mt-1 text-xs text-zinc-500">
          카카오채널이 비어있을 때 이 링크가 문의 버튼에 연결돼요.
        </p>
      </div>

      <div className="h-px bg-zinc-100" />
      <div>
        <p className="text-sm font-semibold">보내는분 (택배 발송지)</p>
        <p className="mt-1 text-xs text-zinc-500">
          택배 송장 엑셀의 &apos;보내는분&apos; 칸에 자동으로 채워져요. 이름과
          연락처는 위 대표자명·대표 연락처를 사용해요.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="senderZipcode">
          발송지 우편번호
        </label>
        <input
          id="senderZipcode"
          name="senderZipcode"
          inputMode="numeric"
          className="input"
          defaultValue={defaults.senderZipcode}
        />
      </div>
      <div>
        <label className="label" htmlFor="senderAddress">
          발송지 주소
        </label>
        <input
          id="senderAddress"
          name="senderAddress"
          className="input"
          defaultValue={defaults.senderAddress}
        />
      </div>
      <div>
        <label className="label" htmlFor="senderAddressDetail">
          발송지 상세주소
        </label>
        <input
          id="senderAddressDetail"
          name="senderAddressDetail"
          className="input"
          defaultValue={defaults.senderAddressDetail}
        />
      </div>

      <div className="h-px bg-zinc-100" />
      <div>
        <p className="text-sm font-semibold">배송비</p>
        <p className="mt-1 text-xs text-zinc-500">
          손님이 주문할 때 자동으로 계산돼요.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="shippingFee">
            기본 배송비 (원)
          </label>
          <input
            id="shippingFee"
            name="shippingFee"
            type="number"
            inputMode="numeric"
            min={0}
            className="input"
            defaultValue={defaults.shippingFee}
          />
        </div>
        <div>
          <label className="label" htmlFor="freeShippingOver">
            무료배송 기준 (원)
          </label>
          <input
            id="freeShippingOver"
            name="freeShippingOver"
            type="number"
            inputMode="numeric"
            min={0}
            className="input"
            defaultValue={defaults.freeShippingOver}
            placeholder="30000"
          />
          <p className="mt-1 text-xs text-zinc-500">
            이 금액 이상 구매하면 배송비가 0원. <b>0으로 두면</b> 무료배송 없이
            항상 기본 배송비가 붙어요.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="courierCost">
            택배 원가 (원)
          </label>
          <input
            id="courierCost"
            name="courierCost"
            type="number"
            inputMode="numeric"
            min={0}
            className="input"
            defaultValue={defaults.courierCost}
            placeholder="2500"
          />
          <p className="mt-1 text-xs text-zinc-500">
            택배사에 실제로 내는 건당 금액이에요. 무료배송으로 보내도 이 비용은
            그대로 나가서, 순익 계산에서 빼드립니다.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="lowStockAt">
            품절임박 기준 (개)
          </label>
          <input
            id="lowStockAt"
            name="lowStockAt"
            type="number"
            inputMode="numeric"
            min={lowStockAtRange.min}
            max={lowStockAtRange.max}
            className="input"
            defaultValue={defaults.lowStockAt}
          />
          <p className="mt-1 text-xs text-zinc-500">
            남은 수량이 이 개수 이하면 강조 표시돼요. {lowStockAtRange.min}~
            {lowStockAtRange.max}개 사이로 정해주세요.
          </p>
        </div>
      </div>

      <div className="h-px bg-zinc-100" />
      <div>
        <p className="text-sm font-semibold">입금 기한</p>
        <p className="mt-1 text-xs text-zinc-500">
          손님이 청구서를 받은 뒤 언제까지 입금하면 되는지 정해요. 기한이
          지났을 때 자동으로 처리하는 기능은 다음 업데이트에서 붙어요 — 지금은
          손님 화면에 기한을 보여주기만 해요.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="paymentDueRule"
            value="HOURS"
            checked={paymentDueRule === "HOURS"}
            onChange={() => setPaymentDueRule("HOURS")}
            className="h-4 w-4"
          />
          청구 후
          <input
            type="number"
            name={paymentDueRule === "HOURS" ? "paymentDueHours" : undefined}
            min={1}
            className="input w-20 py-1.5"
            defaultValue={defaults.paymentDueHours}
            disabled={paymentDueRule !== "HOURS"}
          />
          시간 안에
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="paymentDueRule"
            value="FIXED_TIME"
            checked={paymentDueRule === "FIXED_TIME"}
            onChange={() => setPaymentDueRule("FIXED_TIME")}
            className="h-4 w-4"
          />
          매일
          <input
            type="time"
            name={
              paymentDueRule === "FIXED_TIME" ? "paymentDueFixedTime" : undefined
            }
            className="input w-32 py-1.5"
            defaultValue={defaults.paymentDueFixedTime}
            disabled={paymentDueRule !== "FIXED_TIME"}
          />
          까지
        </label>
        {errorField === "paymentDueFixedTime" && (
          <p className="text-xs font-medium text-red-600">{state?.error}</p>
        )}
      </div>

      <div className="h-px bg-zinc-100" />
      <div>
        <p className="text-sm font-semibold">택배사 접수 정보</p>
        <p className="mt-1 text-xs text-zinc-500">
          이용하는 택배사를 목록에서 골라주세요. 접수사이트·배송조회 주소는
          운영자가 미리 등록해둔 값을 그대로 써요.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="courierId">
          이용 택배사
        </label>
        <select
          id="courierId"
          name="courierId"
          className="input"
          value={courierId}
          onChange={(event) => setCourierId(event.target.value)}
        >
          <option value="">선택 안함</option>
          {couriers.map((courier) => (
            <option key={courier.id} value={courier.id}>
              {courier.name}
            </option>
          ))}
        </select>
        {selectedCourier?.siteUrl && (
          <p className="mt-1 truncate text-xs text-zinc-400">
            접수사이트: {selectedCourier.siteUrl}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="courierLoginId">
            접수사이트 아이디
          </label>
          <input
            id="courierLoginId"
            name="courierLoginId"
            className="input"
            defaultValue={defaults.courierLoginId}
            autoComplete="off"
          />
        </div>
        <div>
          <label className="label" htmlFor="courierCustomerCode">
            계약(고객)코드
          </label>
          <input
            id="courierCustomerCode"
            name="courierCustomerCode"
            className="input"
            defaultValue={defaults.courierCustomerCode}
            placeholder="택배사에서 받은 계약번호"
          />
        </div>
      </div>

      <p className="rounded-xl bg-zinc-50 px-3.5 py-3 text-xs leading-relaxed text-zinc-600">
        비밀번호는 일부러 저장하지 않아요. 택배사 접수사이트는 공식 연동(API)
        계약이 있어야 자동 접수가 되고, 아이디·비밀번호만으로는 대신 로그인할 수
        없어요. 비밀번호를 DB에 넣으면 유출 위험만 커지니 아이디와 계약코드만
        저장해두고, 접수는 아래 바로가기로 로그인해서 엑셀을 올리는 방식이 가장
        안전하고 빨라요.
      </p>

      <div className="h-px bg-zinc-100" />

      <div id="field-bankAccount">
        <label className="label" htmlFor="bankAccount">
          입금계좌 안내
        </label>
        <input
          id="bankAccount"
          name="bankAccount"
          className="input"
          value={bankAccount}
          onChange={(event) => setBankAccount(event.target.value)}
          placeholder="카카오뱅크 3333-01-1234567 홍길동"
        />
        {bankAccountChanged && (
          <div className="mt-2 flex flex-col gap-1.5 rounded-xl bg-amber-50 px-3.5 py-3">
            <label className="label mb-0" htmlFor="currentPassword">
              계좌를 바꾸시는군요 — 비밀번호를 한 번 더 입력해주세요
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              className="input"
            />
            {errorField === "currentPassword" && (
              <p className="text-xs font-medium text-red-600">{state?.error}</p>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="label" htmlFor="noticeText">
          공지사항
        </label>
        <textarea
          id="noticeText"
          name="noticeText"
          rows={3}
          className="input resize-none"
          defaultValue={defaults.noticeText}
          placeholder="예) 라이브 주문은 방송 다음날 순차 발송됩니다."
        />
      </div>

      {state?.error && !["shopName", "kakaoChannelUrl", "currentPassword", "paymentDueFixedTime"].includes(errorField ?? "") && (
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
        {pending ? "저장 중..." : "설정 저장"}
      </button>
    </KeepValuesForm>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div id={`field-${id}`} className={error ? "rounded-xl bg-red-50 p-3 ring-2 ring-red-300" : ""}>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
