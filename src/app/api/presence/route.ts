import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/// 접속자 신호가 이 시간 안에 들어왔으면 '지금 보는 중'으로 본다
export const ACTIVE_WINDOW_MS = 45_000;

/// 손님 화면이 주기적으로 보내는 접속 신호. 누가 몇 명 보고 있는지 세는 데만 씀
export async function POST(request: Request) {
  let visitorId = "";
  try {
    const body = (await request.json()) as { id?: string };
    visitorId = String(body.id ?? "").slice(0, 64);
  } catch {
    return new Response("잘못된 요청이에요.", { status: 400 });
  }

  if (!/^[A-Za-z0-9_-]{8,64}$/.test(visitorId)) {
    return new Response("잘못된 요청이에요.", { status: 400 });
  }

  const user = await getCurrentUser();
  const now = new Date();

  await prisma.presence.upsert({
    where: { id: visitorId },
    create: { id: visitorId, userId: user?.id ?? null, lastSeenAt: now },
    update: { userId: user?.id ?? null, lastSeenAt: now },
  });

  // 오래된 기록은 쌓이지 않게 가끔 정리
  if (Math.random() < 0.05) {
    await prisma.presence.deleteMany({
      where: { lastSeenAt: { lt: new Date(now.getTime() - 60 * 60 * 1000) } },
    });
  }

  return Response.json({ ok: true });
}
