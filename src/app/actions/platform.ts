"use server";

import { createHash, timingSafeEqual } from "crypto";
import { redirect } from "next/navigation";
import { isPlatformLoginId, normalizeLoginId } from "@/lib/access";
import { createSession, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { FormState } from "./auth";

/// 설치 코드가 너무 짧으면 맞춰보기 공격에 약하므로 설정 안 된 것으로 본다
const MIN_SETUP_CODE_LENGTH = 16;

function setupCodeMatches(input: string) {
  const expected = process.env.PLATFORM_SETUP_CODE ?? "";
  if (expected.length < MIN_SETUP_CODE_LENGTH) return false;
  // 길이가 달라도 같은 시간이 걸리게 해시끼리 비교
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function isSetupCodeConfigured() {
  return (process.env.PLATFORM_SETUP_CODE ?? "").length >= MIN_SETUP_CODE_LENGTH;
}

/// 운영자 계정 만들기 (1회용 설치 코드 필요).
/// 비밀값 PLATFORM_LOGIN_IDS 에 있는 아이디 중, 아직 계정이 없는 아이디로만 만들 수 있다.
export async function platformSetupAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const setupCode = String(formData.get("setupCode") ?? "");
  const loginId = normalizeLoginId(String(formData.get("loginId") ?? ""));
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  // 어느 쪽이 틀렸는지는 알려주지 않는다
  if (!setupCodeMatches(setupCode) || !isPlatformLoginId(loginId)) {
    return { error: "설치 코드 또는 아이디가 맞지 않아요." };
  }
  if (password.length < 10) {
    return { error: "운영자 비밀번호는 10자 이상으로 만들어주세요." };
  }
  if (!name || !phone) {
    return { error: "이름과 연락처를 입력해주세요." };
  }

  const exists = await prisma.user.findUnique({ where: { loginId } });
  if (exists) {
    return {
      error:
        "그 아이디는 이미 다른 계정이 쓰고 있어요. 운영자용 아이디를 다른 것으로 바꿔주세요.",
    };
  }

  const user = await prisma.user.create({
    data: {
      loginId,
      password: hashPassword(password),
      name,
      phone,
      role: "CUSTOMER",
      platformAccount: true,
    },
  });

  await createSession(user.id);
  redirect("/platform");
}
