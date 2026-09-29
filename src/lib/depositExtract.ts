/// 은행 알림/문자 원문에서 금액·입금자명을 Haiku로 뽑아내고, 원문에 그대로 있는지
/// 검증한다. 시각은 뽑지 않음 — 폰이 알림을 받은 순간(receivedAt)이 이미 정확한 시각이라
/// 텍스트에서 다시 뽑을 필요가 없음.
import Anthropic from "@anthropic-ai/sdk";

export type ExtractedDeposit = {
  amount: number | null;
  depositorName: string | null;
  /// Haiku가 못 뽑았거나, 뽑은 값이 원문에 그대로 없어서 못 믿는 경우 true.
  /// 이 경우 amount/depositorName은 각각 null로 내려가서(=검증 실패한 값은 버림) 5단계
  /// matchTransaction()이 자동으로 "애매함"으로 처리하게 된다
  invalid: boolean;
};

const SYSTEM_PROMPT = `너는 한국 은행 입금 알림(안드로이드 알림 또는 SMS 문자) 원문에서 두 가지만 뽑는다.
- amount: 입금된 금액(원). 숫자만, 쉼표 없이. 못 찾으면 null.
- depositorName: 입금자 이름. 원문에 적힌 글자 그대로. 못 찾으면 null.
은행명, 계좌번호, 잔액 등 다른 정보는 무시한다. 반드시 extract_deposit 도구만 호출한다.`;

/// 숫자 사이에 낀 쉼표·마침표(천단위 구분자)만 지움. "50,000" → "50000".
/// 날짜("09.28")처럼 원래 숫자가 아닌 자리는 어차피 금액과 우연히 같을 확률이 거의 없어 안전함
export function stripThousandsSeparators(text: string): string {
  let result = text;
  let prev;
  do {
    prev = result;
    result = result.replace(/(\d)[,.](\d)/g, "$1$2");
  } while (result !== prev);
  return result;
}

export function containsAmount(rawText: string, amount: number): boolean {
  const normalized = stripThousandsSeparators(rawText);
  const digitRuns = normalized.match(/\d+/g) ?? [];
  return digitRuns.some((chunk) => (chunk.replace(/^0+/, "") || "0") === String(amount));
}

export function containsName(rawText: string, name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length > 0 && rawText.includes(trimmed);
}

/// 알림이 돈이 "들어온" 건지 "나간" 건지 글자로 먼저 가림.
/// 출금·송금·결제 알림에도 금액과 사람 이름이 들어 있어서(예: 손님께 환불 송금),
/// 이걸 안 막으면 나간 돈이 손님 입금으로 자동 확정될 수 있음.
/// - IN: 입금 표현만 있음 → 평소대로 매칭, 확실하면 자동 확정 가능
/// - OUT: 출금 표현만 있음 → 매칭하지 않고 기록만 남김 (AI 호출도 안 함)
/// - UNKNOWN: 둘 다 없거나 둘 다 있음 → 매칭은 하되 자동 확정은 안 하고 셀러에게 물어봄
export type DepositDirection = "IN" | "OUT" | "UNKNOWN";

const INCOMING_PATTERN = /입금|받았|들어왔/;
const OUTGOING_PATTERN = /출금|인출|송금|보냈|이체\s*완료|결제|승인|자동이체/;

export function classifyDirection(rawText: string): DepositDirection {
  // "입출금통장"처럼 통장 종류 이름에 든 "출금"은 방향과 상관없으니 먼저 지움
  const text = rawText.replace(/입출금/g, "");
  const incoming = INCOMING_PATTERN.test(text);
  const outgoing = OUTGOING_PATTERN.test(text);
  if (incoming && !outgoing) return "IN";
  if (outgoing && !incoming) return "OUT";
  return "UNKNOWN";
}

/// API 키가 없거나 호출이 실패하면 null을 돌려준다 (호출한 쪽에서 "확인 안 됨"으로 처리)
export async function extractDepositFields(rawText: string): Promise<ExtractedDeposit | null> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY가 설정되지 않아 입금 알림 자동 추출을 건너뜀");
    return null;
  }

  let amount: number | null = null;
  let depositorName: string | null = null;

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      tools: [
        {
          name: "extract_deposit",
          description: "은행 입금 알림에서 금액과 입금자명을 보고한다.",
          input_schema: {
            type: "object",
            properties: {
              amount: { type: ["integer", "null"] },
              depositorName: { type: ["string", "null"] },
            },
            required: ["amount", "depositorName"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "extract_deposit" },
      messages: [{ role: "user", content: rawText }],
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );
    const input = toolUse?.input as { amount?: number | null; depositorName?: string | null } | undefined;
    amount = typeof input?.amount === "number" ? input.amount : null;
    depositorName = typeof input?.depositorName === "string" ? input.depositorName : null;
  } catch (error) {
    console.error("입금 알림 자동 추출 실패", error);
    return null;
  }

  // 원문에 그대로 없는 값은 못 믿고 버림 — 발신자 위조·오탐 등으로 엉뚱한 값을 만들어내는 것 방지
  const amountValid = amount != null && containsAmount(rawText, amount);
  const nameValid = depositorName != null && containsName(rawText, depositorName);

  return {
    amount: amountValid ? amount : null,
    depositorName: nameValid ? depositorName : null,
    invalid: !amountValid || !nameValid,
  };
}
