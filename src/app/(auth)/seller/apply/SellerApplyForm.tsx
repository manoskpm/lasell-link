"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { submitSellerApplicationAction } from "@/app/actions/seller";
import { KeepValuesForm } from "@/components/KeepValuesForm";
import { formatBizNumber } from "@/lib/bizNumber";
import { SELLER_CHANNELS } from "@/lib/sellerChannels";

/// 셀러 신청서. 나이 많은 분도 설명 없이 쓸 수 있게:
/// 큰 글씨, 칸마다 예시, 번호 붙은 순서, 오류 난 칸으로 자동 이동.
export function SellerApplyForm({
  loggedInName,
  defaults,
}: {
  /// 로그인한 상태면 그 이름 (계정 칸을 건너뜀)
  loggedInName: string | null;
  defaults: { ownerName: string; phone: string };
}) {
  const [state, formAction, pending] = useActionState(
    submitSellerApplicationAction,
    null
  );
  const [channels, setChannels] = useState<string[]>([]);
  const [bizNumber, setBizNumber] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // 오류가 나면 그 칸으로 화면을 옮기고 바로 고칠 수 있게 커서를 놓는다
  useEffect(() => {
    if (!state?.field) return;
    document
      .getElementById(`field-${state.field}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    document
      .querySelector<HTMLElement>(`[name="${state.field}"]`)
      ?.focus({ preventScroll: true });
  }, [state]);

  const errorFor = (field: string) =>
    state?.field === field ? state.error : undefined;

  const toggleChannel = (channel: string) =>
    setChannels((current) =>
      current.includes(channel)
        ? current.filter((c) => c !== channel)
        : [...current, channel]
    );

  const step = (n: number) => (loggedInName ? n - 1 : n);

  return (
    <KeepValuesForm action={formAction} className="flex flex-col gap-8">
      {loggedInName ? (
        <p className="rounded-2xl bg-zinc-50 px-4 py-3.5 text-base text-zinc-700">
          <b>{loggedInName}</b>님 계정으로 신청돼요.
        </p>
      ) : (
        <Section number={1} title="로그인할 때 쓸 정보">
          <p className="-mt-2 text-sm text-zinc-500">
            이미 가입하셨나요?{" "}
            <Link
              href="/login?next=/seller/apply"
              className="font-semibold text-zinc-900 underline"
            >
              먼저 로그인하기
            </Link>
            {" "}— 그러면 이 칸은 건너뛰어요.
          </p>
          <Field id="loginId" label="아이디" hint="로그인할 때 쓸 이름이에요. 영어나 숫자로 만들어주세요." error={errorFor("loginId")}>
            <input
              id="loginId"
              name="loginId"
              className="input"
              autoComplete="username"
              autoCapitalize="none"
              placeholder="예: happyshop"
            />
          </Field>
          <Field id="password" label="비밀번호" hint="6자 이상이면 돼요." error={errorFor("password")}>
            <div className="flex gap-2">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                className="input"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="shrink-0 rounded-xl border border-zinc-300 px-3 text-sm font-medium text-zinc-700"
              >
                {showPassword ? "숨기기" : "보이기"}
              </button>
            </div>
          </Field>
        </Section>
      )}

      <Section number={step(2)} title="사장님 정보">
        <Field id="ownerName" label="대표자 이름" hint="사업자등록증에 적힌 대표자 이름이에요." error={errorFor("ownerName")}>
          <input
            id="ownerName"
            name="ownerName"
            className="input"
            autoComplete="name"
            defaultValue={defaults.ownerName}
            placeholder="예: 김영희"
          />
        </Field>
        <Field id="phone" label="연락받을 전화번호" hint="승인 결과를 알려드릴 번호예요." error={errorFor("phone")}>
          <input
            id="phone"
            name="phone"
            className="input"
            inputMode="tel"
            autoComplete="tel"
            defaultValue={defaults.phone}
            placeholder="예: 010-1234-5678"
          />
        </Field>
      </Section>

      <Section number={step(3)} title="상점 정보">
        <Field id="shopName" label="상점 이름" hint="손님에게 보일 이름이에요. 나중에 바꿀 수 있어요." error={errorFor("shopName")}>
          <input
            id="shopName"
            name="shopName"
            className="input"
            placeholder="예: 행복한 옷가게"
          />
        </Field>

        <Field id="channels" label="어디에서 방송하세요?" hint="해당하는 곳을 모두 눌러주세요." error={errorFor("channels")}>
          <div className="grid grid-cols-2 gap-2">
            {SELLER_CHANNELS.map((channel) => {
              const on = channels.includes(channel);
              return (
                <button
                  key={channel}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleChannel(channel)}
                  className={`h-14 rounded-xl border-2 text-base font-semibold transition-colors ${
                    on
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-white text-zinc-700"
                  }`}
                >
                  {on ? "✓ " : ""}
                  {channel}
                </button>
              );
            })}
          </div>
          {channels.map((channel) => (
            <input key={channel} type="hidden" name="channels" value={channel} />
          ))}
        </Field>

        <Field id="channelUrl" label="방송 주소" optional hint="채널이나 계정 주소가 있으면 붙여넣어 주세요." error={errorFor("channelUrl")}>
          <input
            id="channelUrl"
            name="channelUrl"
            className="input"
            inputMode="url"
            autoCapitalize="none"
            placeholder="예: youtube.com/@happyshop"
          />
        </Field>

        <Field id="mainProducts" label="파는 상품" hint="어떤 상품을 주로 파시는지 적어주세요." error={errorFor("mainProducts")}>
          <input
            id="mainProducts"
            name="mainProducts"
            className="input"
            placeholder="예: 여성 옷, 아이돌 굿즈"
          />
        </Field>

        <Field id="bizNumber" label="사업자등록번호" hint="사업자등록증 위쪽의 숫자 10자리예요. 숫자만 치면 ‘-’는 저절로 들어가요." error={errorFor("bizNumber")}>
          <input
            id="bizNumber"
            name="bizNumber"
            className="input text-lg tracking-wider tabular-nums"
            inputMode="numeric"
            autoComplete="off"
            placeholder="123-45-67890"
            value={bizNumber}
            onChange={(e) => setBizNumber(formatBizNumber(e.target.value))}
            maxLength={12}
          />
        </Field>
      </Section>

      <Section number={step(4)} title="마지막으로">
        <Field id="message" label="하고 싶은 말" optional hint="방송 경험이나 궁금한 점을 자유롭게 적어주세요." error={errorFor("message")}>
          <textarea
            id="message"
            name="message"
            rows={3}
            className="input resize-none"
            placeholder="예: 인스타 라방 2년째 하고 있어요."
          />
        </Field>

        <div id="field-agree" className="flex flex-col gap-2">
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 ${
              errorFor("agree") ? "border-red-400 bg-red-50" : "border-zinc-200"
            }`}
          >
            <input
              type="checkbox"
              name="agree"
              className="mt-0.5 h-6 w-6 shrink-0 accent-zinc-900"
            />
            <span className="text-base leading-relaxed text-zinc-800">
              적은 내용을 셀러 심사에 쓰는 것에 동의해요.
            </span>
          </label>
          {errorFor("agree") && (
            <p className="text-sm font-medium text-red-600">{errorFor("agree")}</p>
          )}
        </div>
      </Section>

      <div className="flex flex-col gap-3">
        {state?.error && (
          <p
            role="alert"
            className="rounded-2xl bg-red-50 px-4 py-3.5 text-base font-medium leading-relaxed text-red-700"
          >
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="btn-primary py-4 text-lg"
        >
          {pending ? "보내는 중이에요…" : "셀러 신청하기"}
        </button>
        <p className="text-center text-sm text-zinc-500">
          운영자가 확인한 뒤 결과를 알려드려요.
        </p>
      </div>
    </KeepValuesForm>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5">
      <h2 className="flex items-center gap-2.5 text-lg font-bold">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-base text-white">
          {number}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  id,
  label,
  hint,
  optional,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  optional?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      id={`field-${id}`}
      className={`flex flex-col gap-2 ${
        error ? "rounded-2xl bg-red-50 p-3 ring-2 ring-red-300" : ""
      }`}
    >
      <label htmlFor={id} className="text-base font-semibold text-zinc-900">
        {label}
        {optional && (
          <span className="ml-1.5 text-sm font-normal text-zinc-400">(안 적어도 돼요)</span>
        )}
      </label>
      {hint && <p className="-mt-1 text-sm text-zinc-500">{hint}</p>}
      {children}
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
