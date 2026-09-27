"use server";

import { redirect } from "next/navigation";
import { getAccess } from "@/lib/access";
import { createCustomerAccount, newAccountProblem } from "@/lib/account";
import { recordAudit } from "@/lib/audit";
import { createSession } from "@/lib/auth";
import { bizNumberDigits, bizNumberProblem } from "@/lib/bizNumber";
import { prisma } from "@/lib/prisma";
import { SELLER_CHANNELS } from "@/lib/sellerChannels";
import type { FormState } from "./auth";

/// 셀러 신청. 로그인 안 한 분은 계정도 같이 만든다.
/// 오류는 { error, field } 로 돌려주어 화면이 그 칸을 짚어준다.
export async function submitSellerApplicationAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const access = await getAccess();
  const text = (key: string) => String(formData.get(key) ?? "").trim();

  if (access.isPlatform) {
    return {
      error:
        "운영자 계정으로는 셀러 신청을 할 수 없어요. 셀러용 계정을 따로 만들어 신청해주세요.",
    };
  }
  if (access.isSeller) redirect("/seller/status");

  if (access.user) {
    const pending = await prisma.sellerApplication.findFirst({
      where: { userId: access.user.id, status: "PENDING" },
    });
    if (pending) redirect("/seller/status");
  }

  const ownerName = text("ownerName");
  const phone = text("phone");
  const shopName = text("shopName");
  const channels = formData
    .getAll("channels")
    .map(String)
    .filter((c) => (SELLER_CHANNELS as readonly string[]).includes(c));
  const channelUrl = text("channelUrl") || null;
  const mainProducts = text("mainProducts");
  const bizNumber = text("bizNumber");
  const message = text("message") || null;
  const agreed = formData.get("agree") === "on";

  // 로그인 안 한 분은 계정 정보부터 확인 (화면 위쪽 칸부터 순서대로)
  const account = access.user
    ? null
    : {
        loginId: text("loginId"),
        password: String(formData.get("password") ?? ""),
        name: ownerName,
        phone,
      };
  if (account) {
    if (!account.loginId) {
      return { error: "아이디를 적어주세요. 로그인할 때 쓸 이름이에요.", field: "loginId" };
    }
    if (account.password.length < 6) {
      return {
        error: account.password
          ? `비밀번호가 너무 짧아요. 6자 이상으로 만들어주세요. (지금 ${account.password.length}자)`
          : "비밀번호를 적어주세요. 6자 이상이면 돼요.",
        field: "password",
      };
    }
  }

  if (!ownerName) {
    return { error: "대표자 이름을 적어주세요.", field: "ownerName" };
  }
  if (!phone) {
    return {
      error: "연락받을 전화번호를 적어주세요. 예: 010-1234-5678",
      field: "phone",
    };
  }
  if (!shopName) {
    return {
      error: "상점 이름을 적어주세요. 손님에게 보일 이름이에요. 예: 행복한 옷가게",
      field: "shopName",
    };
  }
  if (channels.length === 0) {
    return {
      error: "어디에서 방송하시는지 하나 이상 눌러주세요.",
      field: "channels",
    };
  }
  if (!mainProducts) {
    return {
      error: "어떤 상품을 파시는지 적어주세요. 예: 여성 옷, 아이돌 굿즈",
      field: "mainProducts",
    };
  }
  const bizProblem = bizNumberProblem(bizNumber);
  if (bizProblem) return { error: bizProblem, field: "bizNumber" };
  if (!agreed) {
    return {
      error: "맨 아래 동의 칸을 눌러 체크해주세요. 적어주신 내용은 셀러 심사에만 써요.",
      field: "agree",
    };
  }

  // 계정 중복 등은 모든 칸을 확인한 뒤 마지막에 (DB 확인)
  if (account) {
    const problem = await newAccountProblem(account);
    if (problem) return problem;
  }

  const user = account ? await createCustomerAccount(account) : access.user!;

  const application = await prisma.sellerApplication.create({
    data: {
      userId: user.id,
      shopName,
      ownerName,
      phone,
      channels: channels.join(","),
      channelUrl,
      mainProducts,
      bizNumber: bizNumberDigits(bizNumber),
      message,
    },
  });
  await recordAudit({
    actorUserId: user.id,
    action: "SELLER_APPLY",
    targetType: "SellerApplication",
    targetId: application.id,
    detail: shopName,
  });

  if (account) await createSession(user.id);
  redirect("/seller/status?submitted=1");
}
