"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createSession,
  destroySession,
  hashPassword,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import { homePathFor, isPlatformLoginId } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export type FormState = { error?: string } | null;

export async function signupAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const loginId = String(formData.get("loginId") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const zipcode = String(formData.get("zipcode") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const addressDetail =
    String(formData.get("addressDetail") ?? "").trim() || null;

  if (!loginId || !password || !name || !phone) {
    return { error: "아이디, 비밀번호, 이름, 연락처는 필수예요." };
  }
  if (password.length < 6) {
    return { error: "비밀번호는 6자 이상으로 만들어주세요." };
  }

  // 운영자용으로 예약된 아이디는 일반 가입으로 만들 수 없다 (이유는 알려주지 않음)
  if (isPlatformLoginId(loginId)) {
    return { error: "사용할 수 없는 아이디예요. 다른 아이디를 골라주세요." };
  }

  const exists = await prisma.user.findUnique({ where: { loginId } });
  if (exists) return { error: "이미 사용중인 아이디예요." };

  const user = await prisma.user.create({
    data: {
      loginId,
      password: hashPassword(password),
      name,
      phone,
      zipcode,
      address,
      addressDetail,
      // 가입만으로는 누구도 셀러나 운영자가 될 수 없다. 셀러는 신청 → 운영자 승인으로만.
      role: "CUSTOMER",
    },
  });

  await createSession(user.id);
  redirect("/");
}

export async function loginAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const loginId = String(formData.get("loginId") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findUnique({ where: { loginId } });
  if (!user || !verifyPassword(password, user.password)) {
    return { error: "아이디 또는 비밀번호가 맞지 않아요." };
  }

  await createSession(user.id);
  redirect(homePathFor(user));
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function updateProfileAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!name || !phone) return { error: "이름과 연락처는 필수예요." };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name,
      phone,
      zipcode: String(formData.get("zipcode") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim() || null,
      addressDetail:
        String(formData.get("addressDetail") ?? "").trim() || null,
    },
  });

  revalidatePath("/my");
  return { error: undefined };
}
