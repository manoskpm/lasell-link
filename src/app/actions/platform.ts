"use server";

import { createHash, timingSafeEqual } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  isPlatformLoginId,
  normalizeLoginId,
  requirePlatform,
} from "@/lib/access";
import { recordAudit } from "@/lib/audit";
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

  await recordAudit({
    actorUserId: user.id,
    action: "PLATFORM_SETUP",
    targetType: "User",
    targetId: user.id,
  });

  await createSession(user.id);
  redirect("/platform");
}

// ─── 셀러 신청 심사 ───────────────────────────────────────────

/// 승인: 신청자를 셀러로 바꾸고 상점을 만든다.
/// 상품·주문에 상점 구분이 아직 없어서, 상점이 이미 있으면 두 번째 승인은 막는다.
export async function approveSellerApplicationAction(
  applicationId: number
): Promise<FormState> {
  const operator = await requirePlatform();

  try {
    await prisma.$transaction(async (tx) => {
      const application = await tx.sellerApplication.findUnique({
        where: { id: applicationId },
        include: { user: true },
      });
      if (!application) {
        throw new Error("신청서를 찾을 수 없어요. 목록으로 돌아가 새로고침해주세요.");
      }
      if (application.status !== "PENDING") {
        throw new Error("이미 처리된 신청이에요. 목록으로 돌아가 새로고침해주세요.");
      }
      if (application.user.platformAccount) {
        throw new Error("운영자 계정은 셀러가 될 수 없어요. 이 신청은 거절해주세요.");
      }
      if ((await tx.shop.count()) > 0) {
        throw new Error(
          "지금은 상점을 1개만 운영할 수 있어요. 상점 분리 작업이 끝나면 두 번째 셀러를 승인할 수 있어요. 그때까지 이 신청은 대기로 두면 돼요."
        );
      }

      await tx.sellerApplication.update({
        where: { id: application.id },
        data: {
          status: "APPROVED",
          reviewedById: operator.id,
          reviewedAt: new Date(),
          rejectReason: null,
        },
      });
      await tx.user.update({
        where: { id: application.userId },
        data: { role: "SELLER" },
      });
      const shop = await tx.shop.create({
        data: {
          slug: `shop-${application.userId}`,
          ownerUserId: application.userId,
          name: application.shopName,
        },
      });
      await recordAudit(
        {
          actorUserId: operator.id,
          action: "SELLER_APPROVE",
          targetType: "Shop",
          targetId: shop.id,
          detail: application.shopName,
        },
        tx
      );
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "승인하다가 문제가 생겼어요. 잠시 뒤에 다시 눌러주세요.",
    };
  }

  revalidatePath("/platform", "layout");
  return { error: undefined };
}

/// 거절: 사유는 신청자에게 그대로 보이므로 고칠 점을 친절하게 적는다
export async function rejectSellerApplicationAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const operator = await requirePlatform();
  const applicationId = Number(formData.get("applicationId"));
  const reason = String(formData.get("reason") ?? "").trim();

  if (!reason) {
    return {
      error:
        "거절 이유를 적어주세요. 신청하신 분이 이 글을 보고 고쳐서 다시 신청할 수 있어요.",
      field: "reason",
    };
  }

  const application = await prisma.sellerApplication.findUnique({
    where: { id: applicationId },
  });
  if (!application || application.status !== "PENDING") {
    return { error: "이미 처리된 신청이에요. 목록으로 돌아가 새로고침해주세요." };
  }

  await prisma.sellerApplication.update({
    where: { id: applicationId },
    data: {
      status: "REJECTED",
      rejectReason: reason,
      reviewedById: operator.id,
      reviewedAt: new Date(),
    },
  });
  await recordAudit({
    actorUserId: operator.id,
    action: "SELLER_REJECT",
    targetType: "SellerApplication",
    targetId: applicationId,
    detail: `${application.shopName} · ${reason}`,
  });

  revalidatePath("/platform", "layout");
  return { error: undefined };
}

// ─── 상점 정지·재개 ──────────────────────────────────────────

/// 정지: 셀러 화면이 바로 막히고 손님은 새로 살 수 없다. 주문·장부 데이터는 그대로 둔다
export async function suspendShopAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const operator = await requirePlatform();
  const shopId = Number(formData.get("shopId"));
  const reason = String(formData.get("reason") ?? "").trim();

  if (!reason) {
    return {
      error: "정지 이유를 적어주세요. 셀러가 자기 화면에서 이 글을 보게 돼요.",
      field: "reason",
    };
  }

  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) return { error: "상점을 찾을 수 없어요. 목록을 새로고침해주세요." };
  if (shop.status === "SUSPENDED") return { error: "이미 정지된 상점이에요." };

  await prisma.shop.update({
    where: { id: shopId },
    data: { status: "SUSPENDED", suspendReason: reason, suspendedAt: new Date() },
  });
  await recordAudit({
    actorUserId: operator.id,
    action: "SHOP_SUSPEND",
    targetType: "Shop",
    targetId: shopId,
    detail: `${shop.name} · ${reason}`,
  });

  revalidatePath("/", "layout");
  return { error: undefined };
}

export async function resumeShopAction(shopId: number): Promise<FormState> {
  const operator = await requirePlatform();

  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) return { error: "상점을 찾을 수 없어요. 목록을 새로고침해주세요." };
  if (shop.status === "ACTIVE") return { error: "이미 영업 중인 상점이에요." };

  await prisma.shop.update({
    where: { id: shopId },
    data: { status: "ACTIVE", suspendReason: null, suspendedAt: null },
  });
  await recordAudit({
    actorUserId: operator.id,
    action: "SHOP_RESUME",
    targetType: "Shop",
    targetId: shopId,
    detail: shop.name,
  });

  revalidatePath("/", "layout");
  return { error: undefined };
}
