"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createCustomerAccount, newAccountProblem } from "@/lib/account";
import {
  createSession,
  destroySession,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import { homePathFor, safeNextPath } from "@/lib/access";
import { prisma } from "@/lib/prisma";

/// 오류가 난 칸(field)을 같이 알려주면 화면이 그 칸을 짚어준다
export type FormState = { error?: string; field?: string } | null;

export async function signupAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const account = {
    loginId: String(formData.get("loginId") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    name: String(formData.get("name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    zipcode: String(formData.get("zipcode") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    addressDetail: String(formData.get("addressDetail") ?? "").trim() || null,
  };

  const problem = await newAccountProblem(account);
  if (problem) return problem;

  // 가입만으로는 누구도 셀러나 운영자가 될 수 없다. 셀러는 신청 → 운영자 승인으로만.
  const user = await createCustomerAccount(account);

  await createSession(user.id);
  redirect("/");
}

export async function loginAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const loginId = String(formData.get("loginId") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!loginId) return { error: "아이디를 적어주세요.", field: "loginId" };
  if (!password) return { error: "비밀번호를 적어주세요.", field: "password" };

  const user = await prisma.user.findUnique({ where: { loginId } });
  if (!user || !verifyPassword(password, user.password)) {
    return {
      error:
        "아이디나 비밀번호가 맞지 않아요. 대소문자와 띄어쓰기를 확인하고 다시 적어주세요.",
      field: "password",
    };
  }

  await createSession(user.id);
  redirect(safeNextPath(formData.get("next")) ?? homePathFor(user));
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
