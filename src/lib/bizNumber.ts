/// 사업자등록번호 형식 검사 (화면과 서버 양쪽에서 씀).
/// 진짜 등록된 번호인지는 여기서 확인하지 않는다 — 운영자가 승인 화면에서 홈택스로 직접 확인.

export function bizNumberDigits(raw: string) {
  return raw.replace(/\D/g, "");
}

/// 123-45-67890 모양으로
export function formatBizNumber(raw: string) {
  const d = bizNumberDigits(raw).slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

/// 국세청이 쓰는 검증 숫자 계산. 한 자리를 잘못 적은 경우를 대부분 잡아낸다.
function checksumOk(d: string) {
  const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(d[i]) * weights[i];
  sum += Math.floor((Number(d[8]) * 5) / 10);
  return (10 - (sum % 10)) % 10 === Number(d[9]);
}

/// 문제가 있으면 손님에게 보여줄 문장, 없으면 null
export function bizNumberProblem(raw: string): string | null {
  const d = bizNumberDigits(raw);
  if (d.length === 0) {
    return "사업자등록번호를 적어주세요. 사업자등록증 위쪽에 있는 숫자 10자리예요.";
  }
  if (d.length !== 10) {
    return `사업자등록번호는 숫자 10자리예요. 지금은 ${d.length}자리가 적혀 있어요. 사업자등록증을 보고 다시 적어주세요.`;
  }
  if (!checksumOk(d)) {
    return "사업자등록번호 중에 잘못 적힌 숫자가 있는 것 같아요. 사업자등록증과 한 자리씩 맞춰봐 주세요.";
  }
  return null;
}
