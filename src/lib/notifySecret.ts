/// 입금 알림 자동 확인(6단계) 연동키. 평문은 발급 화면에서 한 번만 보여주고
/// DB에는 해시만 저장한다 (셀러 로그인 비밀번호와 같은 취급).
import { createHash, randomBytes, timingSafeEqual } from "crypto";

export function generateNotifySecret() {
  return randomBytes(24).toString("base64url");
}

export function hashNotifySecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export function notifySecretMatches(secret: string, storedHash: string) {
  const a = createHash("sha256").update(secret).digest();
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
