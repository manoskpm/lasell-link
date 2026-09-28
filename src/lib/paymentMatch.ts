/// 은행 거래내역 텍스트를 읽어서 미입금 정산과 맞춰보는 순수 로직.
/// DB에 접근하지 않는다 — 실제 데이터 조회는 서버 액션(app/actions/paymentMatch.ts)에서 하고
/// 여기서는 "이 거래가 어느 정산인지" 판단만 한다.

export type ParsedTransaction = {
  raw: string;
  date: Date | null;
  amount: number | null;
  depositorName: string | null;
};

export type SettlementCandidate = {
  id: number;
  userId: number | null;
  buyerName: string;
  depositorName: string | null;
  /// 회원가입한 이름 (게스트 주문이면 null)
  accountName: string | null;
  /// 손님이 실제로 입금해야 하는 금액 (상품 + 배송비 - 배송비차감 - 할인)
  amount: number;
  createdAt: Date;
};

export type MatchCandidate = {
  settlementId: number;
  buyerName: string;
  amount: number;
  createdAt: Date;
  userId: number | null;
};

export type MatchOutcome =
  | {
      type: "confident";
      settlementIds: number[];
      userId: number | null;
      customerName: string;
      note: string;
    }
  | { type: "ambiguous"; candidates: MatchCandidate[]; note: string }
  | { type: "insufficient"; candidates: MatchCandidate[]; note: string }
  | { type: "none"; note: string };

// ── 텍스트 해석 ──────────────────────────────────────────────

// 날짜: 2026-09-28, 2026.09.28, 2026/09/28 (+시각 14:32 또는 14:32:00)
const DATE_RE = /(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})(?:\s+(\d{1,2}:\d{2}(?::\d{2})?))?/;
// 금액: 1,000 처럼 콤마가 있거나, 네 자리 이상 숫자
const AMOUNT_RE = /\d{1,3}(?:,\d{3})+|\d{4,}/g;
// 한글 이름 후보 (성+이름 2~5글자)
const NAME_RE = /[가-힣]{2,5}/g;

// 거래내역에 자주 나오지만 사람 이름이 아닌 낱말 (이름으로 잘못 뽑는 것 방지)
const NAME_STOPWORDS = new Set([
  "입금",
  "출금",
  "이체",
  "송금",
  "거래",
  "내역",
  "잔액",
  "적요",
  "구분",
  "통장",
  "계좌",
  "수수료",
  "이자",
  "카드",
  "결제",
  "취소",
  "환불",
  "은행",
  "체크",
  "카카오뱅크",
  "국민은행",
  "신한은행",
  "우리은행",
  "하나은행",
  "농협은행",
  "기업은행",
  "새마을금고",
  "저축은행",
  "케이뱅크",
  "토스뱅크",
  "인터넷뱅킹",
  "모바일뱅킹",
]);

export function parseBankStatementLine(rawLine: string): ParsedTransaction {
  const raw = rawLine.trim();
  if (!raw) return { raw, date: null, amount: null, depositorName: null };

  let residual = raw;

  // 1) 날짜/시각 (금액으로 잘못 읽히지 않도록 먼저 지워둠)
  let date: Date | null = null;
  const dateMatch = raw.match(DATE_RE);
  if (dateMatch) {
    const datePart = dateMatch[1].replace(/[./]/g, "-");
    const timePart = dateMatch[2] ?? "00:00:00";
    const time = timePart.split(":").length === 2 ? `${timePart}:00` : timePart;
    const parsed = new Date(`${datePart}T${time}+09:00`);
    if (!Number.isNaN(parsed.getTime())) date = parsed;
    residual = residual.replace(dateMatch[0], " ");
  }

  // 2) 금액 (제일 먼저 나오는 숫자를 거래금액으로 봄. 보통 '입금액 | 잔액' 순서)
  const amountTokens = [...residual.matchAll(AMOUNT_RE)];
  const amount = amountTokens.length > 0 ? Number(amountTokens[0][0].replace(/,/g, "")) : null;
  for (const token of amountTokens) residual = residual.replace(token[0], " ");

  // 3) 입금자명 (남은 글자 중 은행 용어가 아닌 첫 한글 낱말)
  const nameCandidates = [...residual.matchAll(NAME_RE)].map((m) => m[0]);
  const depositorName = nameCandidates.find((n) => !NAME_STOPWORDS.has(n)) ?? null;

  return { raw, date, amount, depositorName };
}

export function parseBankStatement(rawText: string): ParsedTransaction[] {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseBankStatementLine);
}

// ── 이름 비교 ────────────────────────────────────────────────

export function normalizeName(name: string | null | undefined): string {
  if (!name) return "";
  return name.replace(/\s+/g, "").replace(/님$/, "");
}

function namesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  return na.length > 0 && na === nb;
}

function settlementNames(s: SettlementCandidate): string[] {
  return [s.depositorName, s.buyerName, s.accountName].filter(
    (n): n is string => Boolean(n)
  );
}

function matchesByNameOrAlias(
  s: SettlementCandidate,
  depositorName: string | null,
  aliasUserId: number | null
): boolean {
  if (aliasUserId != null && s.userId === aliasUserId) return true;
  if (!depositorName) return false;
  return settlementNames(s).some((n) => namesMatch(n, depositorName));
}

function timeDistance(s: SettlementCandidate, txDate: Date | null): number {
  if (!txDate) return Number.MAX_SAFE_INTEGER;
  return Math.abs(s.createdAt.getTime() - txDate.getTime());
}

function toCandidate(s: SettlementCandidate): MatchCandidate {
  return {
    settlementId: s.id,
    buyerName: s.buyerName,
    amount: s.amount,
    createdAt: s.createdAt,
    userId: s.userId,
  };
}

/// 한 손님의 미입금 정산들 중 합이 정확히 target이 되는 조합을 전부 찾음.
/// 보통 한 손님이 미입금 정산을 여러 건 쌓아두는 일은 많지 않으므로 전체 탐색으로 충분함
function findSubsetSums(
  settlements: SettlementCandidate[],
  target: number,
  maxCount = 10
): SettlementCandidate[][] {
  const pool = settlements.slice(0, maxCount);
  const results: SettlementCandidate[][] = [];
  const n = pool.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    let sum = 0;
    const subset: SettlementCandidate[] = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        sum += pool[i].amount;
        subset.push(pool[i]);
      }
    }
    if (sum === target) results.push(subset);
  }
  return results;
}

/// 거래 한 건을 미입금 정산 목록과 맞춰본다.
/// aliasUserId: 입금자명으로 이미 기억해둔 손님이 있으면 그 손님 id (없으면 null)
export function matchTransaction(
  tx: ParsedTransaction,
  unpaidSettlements: SettlementCandidate[],
  aliasUserId: number | null
): MatchOutcome {
  if (tx.amount == null) {
    return { type: "none", note: "금액을 읽지 못했어요." };
  }
  const amount = tx.amount;

  // 1) 금액이 정확히 같은 정산
  const exactAmount = unpaidSettlements.filter((s) => s.amount === amount);
  if (exactAmount.length > 0) {
    const nameFiltered = exactAmount.filter((s) =>
      matchesByNameOrAlias(s, tx.depositorName, aliasUserId)
    );

    if (nameFiltered.length === 1) {
      const s = nameFiltered[0];
      return {
        type: "confident",
        settlementIds: [s.id],
        userId: s.userId,
        customerName: s.buyerName,
        note: "금액과 이름이 모두 일치해요.",
      };
    }

    if (exactAmount.length === 1) {
      // 이름은 안 맞지만(혹은 못 읽었지만) 이 금액인 정산이 하나뿐인 경우
      return {
        type: "ambiguous",
        candidates: [toCandidate(exactAmount[0])],
        note: tx.depositorName
          ? "이 금액과 일치하는 정산은 하나뿐인데, 입금자명이 달라요. 맞는지 확인해주세요."
          : "이 금액과 일치하는 정산은 하나뿐이지만, 입금자명을 읽지 못했어요. 맞는지 확인해주세요.",
      };
    }

    // 이름으로 좁혀졌지만(2건 이상) 아직 하나는 아닌 경우에만 시간으로 한 번 더 좁혀봄.
    // 이름이 아예 안 맞는 상태(nameFiltered가 0건)에서는 시간만으로 추측하지 않는다 —
    // 우연히 시각이 가까운 다른 사람 정산을 잘못 고를 위험이 있기 때문
    if (nameFiltered.length > 1) {
      if (tx.date) {
        const sorted = [...nameFiltered].sort(
          (a, b) => timeDistance(a, tx.date) - timeDistance(b, tx.date)
        );
        if (timeDistance(sorted[0], tx.date) < timeDistance(sorted[1], tx.date)) {
          const s = sorted[0];
          return {
            type: "confident",
            settlementIds: [s.id],
            userId: s.userId,
            customerName: s.buyerName,
            note: "금액·이름이 같은 정산이 여러 건이라 입금 시각이 가장 가까운 건으로 골랐어요.",
          };
        }
      }
      return {
        type: "ambiguous",
        candidates: nameFiltered.map(toCandidate),
        note: "같은 이름·금액의 정산이 여러 건이에요. 누구의 입금인지 골라주세요.",
      };
    }

    return {
      type: "ambiguous",
      candidates: exactAmount.map(toCandidate),
      note: "금액이 같은 정산이 여러 건이고, 이름으로 좁혀지지 않아요. 누구의 입금인지 직접 골라주세요.",
    };
  }

  // 2) 합산 입금: 같은 손님의 정산 여러 건을 한 번에 낸 경우
  const named = unpaidSettlements.filter((s) =>
    matchesByNameOrAlias(s, tx.depositorName, aliasUserId)
  );
  if (named.length >= 2) {
    const subsets = findSubsetSums(named, amount);
    if (subsets.length === 1) {
      const subset = subsets[0];
      return {
        type: "confident",
        settlementIds: subset.map((s) => s.id),
        userId: subset[0].userId,
        customerName: subset[0].buyerName,
        note: `정산 ${subset.length}건을 한 번에 입금한 것으로 보여요 (합계가 일치해요).`,
      };
    }
    if (subsets.length > 1) {
      return {
        type: "ambiguous",
        candidates: named.map(toCandidate),
        note: "합계가 맞는 정산 조합이 여러 가지예요. 어떤 정산들인지 직접 골라주세요.",
      };
    }
  }

  // 3) 이름은 맞는 손님을 찾았지만 금액이 안 맞음 → 부분입금일 수 있으니 자동 처리 안 함
  if (named.length > 0) {
    const total = named.reduce((sum, s) => sum + s.amount, 0);
    return {
      type: amount < Math.min(...named.map((s) => s.amount)) ? "insufficient" : "ambiguous",
      candidates: named.map(toCandidate),
      note:
        amount < total
          ? "이 손님이 받을 정산 금액보다 입금액이 적어요. 부분입금일 수 있으니 직접 확인해주세요."
          : "이 손님의 정산 금액과 입금액이 맞지 않아요. 맞는 정산을 직접 골라주세요.",
    };
  }

  // 4) 아무 단서도 없음
  return { type: "none", note: "관련된 정산을 찾지 못했어요." };
}
