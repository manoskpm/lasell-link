import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { applyDepositMatch, loadUnpaidSettlements } from "@/lib/depositMatchCore";
import { classifyDirection, extractDepositFields } from "@/lib/depositExtract";
import { normalizeName, matchTransaction, type ParsedTransaction } from "@/lib/paymentMatch";
import { notifySecretMatches } from "@/lib/notifySecret";
import { maskLongDigitRuns } from "@/lib/shop";
import { checkRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";

/// 폰 하나가 실수로 알림을 쏟아부어도 서버 비용(Haiku 호출 등)이 무한정 늘지 않게 막는 한도.
/// 라방 중이라도 입금이 초당 여러 건씩 오지는 않으므로 넉넉한 값
const RATE_LIMIT_PER_MINUTE = 30;
const RAW_TEXT_RETENTION_DAYS = 90;
/// 은행 앱이 같은 알림을 업데이트·재게시하면 앱이 보내는 수신시각이 달라져
/// dedupeHash(원문+시각)가 달라질 수 있음. 그런 경우를 잡기 위해 원문만으로도
/// 최근 이 시간 안에 들어온 게 있으면 중복으로 봄
const CONTENT_DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

type NotifyBody = {
  rawText?: unknown;
  receivedAt?: unknown;
  source?: unknown;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

/// 셀러 폰의 알림 리스너 앱(안드로이드) / 단축어(아이폰)가 호출하는 주소.
/// 사람이 보는 화면이 아니라 기기가 호출하는 API라 오류 문구는 앱/단축어 쪽 로그용임
export async function POST(
  request: Request,
  { params }: { params: Promise<{ shopSlug: string }> }
) {
  const { shopSlug } = await params;

  if (!checkRateLimit(`notify:${shopSlug}`, RATE_LIMIT_PER_MINUTE, 60_000)) {
    return jsonError("요청이 너무 많아요. 잠시 후 다시 시도해주세요.", 429);
  }

  const shop = await prisma.shop.findUnique({ where: { slug: shopSlug } });
  if (!shop || !shop.notifySecretHash) {
    return jsonError("등록되지 않은 상점이에요.", 404);
  }

  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
  if (!token || !notifySecretMatches(token, shop.notifySecretHash)) {
    return jsonError("인증키가 올바르지 않아요.", 401);
  }

  let body: NotifyBody;
  try {
    body = (await request.json()) as NotifyBody;
  } catch {
    return jsonError("요청 내용을 읽을 수 없어요.", 400);
  }

  const rawText = typeof body.rawText === "string" ? body.rawText.trim() : "";
  const source = body.source === "IOS" ? "IOS" : body.source === "ANDROID" ? "ANDROID" : null;
  if (!rawText || !source) {
    return jsonError("rawText와 source(ANDROID|IOS)가 필요해요.", 400);
  }
  const receivedAtRaw = typeof body.receivedAt === "string" ? new Date(body.receivedAt) : null;
  const receivedAt = receivedAtRaw && !Number.isNaN(receivedAtRaw.getTime()) ? receivedAtRaw : new Date();

  // 계좌번호로 보이는 긴 숫자는 저장 전에 가림. 90일 지난 예전 알림의 원문은 이 기회에 비움
  const rawTextMasked = maskLongDigitRuns(rawText);
  await prisma.depositNotification.updateMany({
    where: {
      shopId: shop.id,
      rawTextMasked: { not: null },
      createdAt: { lt: new Date(Date.now() - RAW_TEXT_RETENTION_DAYS * 24 * 60 * 60 * 1000) },
    },
    data: { rawTextMasked: null },
  });

  // 정확히 같은 요청이 두 번 오는 경우(네트워크 재시도 등)를 막음
  const dedupeHash = createHash("sha256")
    .update(`${shop.id}|${rawText}|${receivedAt.toISOString()}`)
    .digest("hex");
  const existing = await prisma.depositNotification.findUnique({ where: { dedupeHash } });
  if (existing) {
    return Response.json({ ok: true, duplicate: true });
  }

  // 은행 앱이 알림을 업데이트/재게시해서 앱이 보내는 수신시각이 달라진 경우를 막음:
  // 원문(시각 제외)이 같고 방금 전(10분 안)에 들어온 게 이미 있으면 중복으로 봄
  const contentHash = createHash("sha256").update(`${shop.id}|${rawText}`).digest("hex");
  const recentSameContent = await prisma.depositNotification.findFirst({
    where: {
      shopId: shop.id,
      contentHash,
      createdAt: { gte: new Date(Date.now() - CONTENT_DUPLICATE_WINDOW_MS) },
    },
  });
  if (recentSameContent) {
    return Response.json({ ok: true, duplicate: true });
  }

  // 출금·송금·결제 알림은 입금이 아님 → 매칭하지 않고 기록만 남김 (셀러 화면에도 안 뜸)
  const direction = classifyDirection(rawText);
  if (direction === "OUT") {
    try {
      await prisma.depositNotification.create({
        data: {
          shopId: shop.id,
          source,
          dedupeHash,
          contentHash,
          receivedAt,
          rawTextMasked,
          extractedAmount: null,
          extractedName: null,
          extractionInvalid: true,
          matchType: "NONE",
          settlementIds: "[]",
          matchedUserId: null,
          matchedCustomerName: null,
          status: "DISMISSED",
          autoConfirmed: false,
        },
      });
    } catch {
      return Response.json({ ok: true, duplicate: true });
    }
    await prisma.shop.update({ where: { id: shop.id }, data: { lastNotifyReceivedAt: new Date() } });
    return Response.json({ ok: true, ignored: "not_deposit" });
  }

  const extracted = await extractDepositFields(rawText);
  const amount = extracted?.amount ?? null;
  const depositorName = extracted?.depositorName ?? null;
  const extractionInvalid = extracted?.invalid ?? true;

  const [unpaidSettlements, aliases] = await Promise.all([
    loadUnpaidSettlements(),
    prisma.depositorAlias.findMany({ where: { shopId: shop.id } }),
  ]);
  const aliasByName = new Map(aliases.map((a) => [normalizeName(a.depositorName), a.userId]));
  const aliasUserId = depositorName ? (aliasByName.get(normalizeName(depositorName)) ?? null) : null;

  const tx: ParsedTransaction = { raw: rawText, date: receivedAt, amount, depositorName };
  const outcome = matchTransaction(tx, unpaidSettlements, aliasUserId);

  const settlementIds = outcome.type === "confident" ? outcome.settlementIds : outcome.type === "none" ? [] : outcome.candidates.map((c) => c.settlementId);
  const matchedUserId = outcome.type === "confident" ? outcome.userId : null;
  const matchedCustomerName = outcome.type === "confident" ? outcome.customerName : null;

  let status: "PENDING" | "RESOLVED" = "PENDING";
  let autoConfirmed = false;

  // 안드로이드 + 확실함 조합만 자동 확정함. 아이폰 문자는 발신번호 위조 위험이 있어
  // 아무리 확실해도 셀러가 "확실한 입금 묶음"에서 직접 한 번 더 확인해야 함
  // 추가 조건: 알림 글자에 "입금" 표현이 분명히 있을 때만(direction === "IN") 자동 확정.
  // 애매한 알림(UNKNOWN)은 확실히 매칭돼도 셀러가 화면에서 한 번 눌러 확인함
  if (outcome.type === "confident" && source === "ANDROID" && direction === "IN") {
    const applied = await applyDepositMatch({
      shopId: shop.id,
      actorUserId: shop.ownerUserId,
      settlementIds: outcome.settlementIds,
      depositorName,
      userId: outcome.userId,
      rememberAlias: true,
      auditAction: "DEPOSIT_AUTO_MATCHED",
    });
    if ("ok" in applied) {
      status = "RESOLVED";
      autoConfirmed = true;
    }
    // 실패하면(이미 처리됐거나 취소된 경우 등) PENDING으로 남겨서 셀러가 화면에서 보게 함
  }

  try {
    await prisma.depositNotification.create({
      data: {
        shopId: shop.id,
        source,
        dedupeHash,
        contentHash,
        receivedAt,
        rawTextMasked,
        extractedAmount: amount,
        extractedName: depositorName,
        extractionInvalid,
        matchType: outcome.type.toUpperCase(),
        settlementIds: JSON.stringify(settlementIds),
        matchedUserId,
        matchedCustomerName,
        status,
        autoConfirmed,
      },
    });
  } catch {
    // 거의 동시에 같은 알림이 두 번 들어온 경우(dedupeHash 유니크 충돌) — 이미 처리된 것으로 봄
    return Response.json({ ok: true, duplicate: true });
  }

  await prisma.shop.update({
    where: { id: shop.id },
    data: { lastNotifyReceivedAt: new Date() },
  });

  revalidatePath("/", "layout");
  return Response.json({ ok: true, matchType: outcome.type, autoConfirmed });
}
