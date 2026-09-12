"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { updateSettingsAction } from "@/app/actions/settings";
import { COURIER_PRESETS } from "@/lib/tracking";

export function SettingsForm({
  defaults,
  logoUrl,
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
    courierName: string;
    courierSiteUrl: string;
    courierLoginId: string;
    courierCustomerCode: string;
    trackingUrlTemplate: string;
  };
  logoUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    updateSettingsAction,
    null
  );
  const [preview, setPreview] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [courierName, setCourierName] = useState(defaults.courierName);
  const [courierSiteUrl, setCourierSiteUrl] = useState(defaults.courierSiteUrl);
  const [trackingUrlTemplate, setTrackingUrlTemplate] = useState(
    defaults.trackingUrlTemplate
  );

  const shownLogo = preview ?? (removeLogo ? null : logoUrl);

  return (
    <form action={formAction} className="flex flex-col gap-4">
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

      <div>
        <label className="label" htmlFor="shopName">
          상호 (브랜드명) *
        </label>
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
      </div>

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

      <div>
        <label className="label" htmlFor="kakaoChannelUrl">
          카카오채널 링크
        </label>
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
      </div>

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
        <p className="text-sm font-semibold">택배사 접수 정보</p>
        <p className="mt-1 text-xs text-zinc-500">
          택배사를 고르면 배송조회 주소가 자동으로 채워져요.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="courierName">
          이용 택배사
        </label>
        <select
          id="courierName"
          name="courierName"
          className="input"
          value={courierName}
          onChange={(event) => {
            const value = event.target.value;
            setCourierName(value);
            const preset = COURIER_PRESETS.find((item) => item.name === value);
            if (preset) {
              setCourierSiteUrl(preset.siteUrl);
              setTrackingUrlTemplate(preset.trackingUrlTemplate);
            }
          }}
        >
          <option value="">선택 안함</option>
          {COURIER_PRESETS.map((preset) => (
            <option key={preset.name} value={preset.name}>
              {preset.name}
            </option>
          ))}
        </select>
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

      <div>
        <label className="label" htmlFor="courierSiteUrl">
          접수사이트 바로가기 주소
        </label>
        <input
          id="courierSiteUrl"
          name="courierSiteUrl"
          type="url"
          className="input"
          value={courierSiteUrl}
          onChange={(event) => setCourierSiteUrl(event.target.value)}
          placeholder="https://..."
        />
      </div>

      <div>
        <label className="label" htmlFor="trackingUrlTemplate">
          배송조회 주소
        </label>
        <input
          id="trackingUrlTemplate"
          name="trackingUrlTemplate"
          className="input"
          value={trackingUrlTemplate}
          onChange={(event) => setTrackingUrlTemplate(event.target.value)}
          placeholder="https://... {{번호}}"
        />
        <p className="mt-1 text-xs text-zinc-500">
          {"{{번호}}"} 자리에 운송장번호가 들어가요. 택배사가 주소를 바꾸면 여기서
          고치면 손님 화면의 배송조회 버튼도 같이 바뀌어요.
        </p>
      </div>

      <div className="h-px bg-zinc-100" />

      <div>
        <label className="label" htmlFor="bankAccount">
          입금계좌 안내
        </label>
        <input
          id="bankAccount"
          name="bankAccount"
          className="input"
          defaultValue={defaults.bankAccount}
          placeholder="카카오뱅크 3333-01-1234567 홍길동"
        />
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
        {pending ? "저장 중..." : "설정 저장"}
      </button>
    </form>
  );
}
