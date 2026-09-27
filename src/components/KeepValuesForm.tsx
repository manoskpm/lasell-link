"use client";

import { useTransition } from "react";

/// 오류가 나도 적은 내용이 지워지지 않는 입력 틀.
/// 보통 <form action={...}> 은 제출이 끝나면 칸을 전부 비우는데,
/// 긴 입력 화면에서 오류 한 번에 다 날아가면 다시 적기가 너무 힘들다.
/// 제출을 직접 넘겨서 칸이 비워지지 않게 한다.
export function KeepValuesForm({
  action,
  className,
  formRef,
  children,
}: {
  action: (formData: FormData) => void;
  className?: string;
  formRef?: React.Ref<HTMLFormElement>;
  children: React.ReactNode;
}) {
  const [, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      className={className}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => action(formData));
      }}
    >
      {children}
    </form>
  );
}
