import { cache } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";
import { prisma } from "./prisma";

/// 역할은 세 가지.
/// - PLATFORM: 운영자. DB에 저장하지 않고, 환경 비밀값 PLATFORM_LOGIN_IDS(쉼표로 구분)에
///   적힌 로그인 아이디인지로만 판단한다. 아이디를 코드에 적지 말 것.
/// - SELLER: 운영자가 승인한 셀러 (User.role = "SELLER")
/// - CUSTOMER: 손님 (User.role 기본값)

export function normalizeLoginId(loginId: string) {
  return loginId.trim().toLowerCase();
}

function platformLoginIds(): Set<string> {
  return new Set(
    (process.env.PLATFORM_LOGIN_IDS ?? "")
      .split(",")
      .map(normalizeLoginId)
      .filter(Boolean)
  );
}

/// 운영자용으로 예약된 아이디인지 (가입 차단, 목록에서 숨기기에 사용)
export function isPlatformLoginId(loginId: string) {
  return platformLoginIds().has(normalizeLoginId(loginId));
}

/// 비밀값에 적힌 운영자 아이디 중 아직 계정이 안 만들어진 게 있는지 (설치 화면 열림 여부)
export async function hasPendingPlatformSetup() {
  const ids = [...platformLoginIds()];
  if (ids.length === 0) return false;
  const created = await prisma.user.count({
    where: { loginId: { in: ids }, platformAccount: true },
  });
  return created < ids.length;
}

type AccessUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

type AccessShop = { id: number; name: string; status: string } | null;

export type Access = {
  user: AccessUser | null;
  isPlatform: boolean;
  isSeller: boolean;
  /// 셀러 본인의 상점 (셀러가 아니면 null)
  shop: AccessShop;
  /// 셀러인데 상점이 정지됨
  isSuspendedSeller: boolean;
  /// 셀러 화면(/admin)을 쓸 수 있는지: 운영자, 또는 영업 중인 상점의 셀러
  canUseSellerConsole: boolean;
};

function isPlatformUser(user: AccessUser | null) {
  // 두 조건이 모두 맞아야 운영자: 설치 화면으로 만든 계정 + 비밀값 목록의 아이디.
  // 비밀값에서 아이디를 빼면 즉시 운영자 권한이 사라진다.
  return Boolean(user && user.platformAccount && isPlatformLoginId(user.loginId));
}

/// 한 번의 화면 그리기 안에서는 결과를 재사용 (공식 가이드의 데이터 접근 계층 방식)
export const getAccess = cache(async (): Promise<Access> => {
  const user = await getCurrentUser();
  const isPlatform = isPlatformUser(user);
  const isSeller = user?.role === "SELLER";

  // 정지 여부는 요청마다 DB에서 다시 읽는다 → 운영자가 정지하면 바로 막힘
  const shop: AccessShop =
    user && isSeller
      ? await prisma.shop.findUnique({
          where: { ownerUserId: user.id },
          select: { id: true, name: true, status: true },
        })
      : null;
  const sellerActive = isSeller && shop?.status === "ACTIVE";

  return {
    user,
    isPlatform,
    isSeller,
    shop,
    isSuspendedSeller: isSeller && !sellerActive,
    canUseSellerConsole: isPlatform || sellerActive,
  };
});

/// 로그인 뒤 돌아갈 곳. 아무 주소나 받으면 외부 사기 사이트로 보내는 데 악용될 수 있어
/// 정해진 화면만 허용한다.
const ALLOWED_NEXT_PATHS = new Set(["/seller/apply", "/seller/status"]);
export function safeNextPath(next: unknown): string | null {
  return typeof next === "string" && ALLOWED_NEXT_PATHS.has(next) ? next : null;
}

/// 로그인 직후 어디로 보낼지
export function homePathFor(user: AccessUser) {
  if (isPlatformUser(user)) return "/platform";
  if (user.role === "SELLER") return "/admin"; // 정지된 셀러는 거기서 상태 화면으로 안내됨
  return "/";
}

/// 셀러 화면용 검사. 영업 중인 셀러와 운영자만 통과. 서버 액션·페이지·API 모두 이걸로 막는다.
export async function requireSellerConsole() {
  const access = await getAccess();
  if (!access.user) redirect("/login");
  if (access.isSuspendedSeller && !access.isPlatform) redirect("/seller/status");
  if (!access.canUseSellerConsole) redirect("/");
  return access.user;
}

/// 운영자 화면용 검사. 운영자만 통과.
export async function requirePlatform() {
  const access = await getAccess();
  if (!access.user) redirect("/login");
  if (!access.isPlatform) redirect("/");
  return access.user;
}

/// API 경로용: 이동(redirect) 대신 403 응답을 돌려준다. 통과하면 null.
export async function sellerConsoleApiGuard(): Promise<Response | null> {
  const access = await getAccess();
  if (!access.canUseSellerConsole) {
    return new Response(
      "셀러 화면에서만 받을 수 있는 파일이에요. 셀러 계정으로 로그인한 뒤 다시 눌러주세요.",
      { status: 403 }
    );
  }
  return null;
}
