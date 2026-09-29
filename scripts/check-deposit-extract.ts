// 입금 알림 원문 검증(containsAmount/containsName) 단위 테스트: npm run check:deposit-extract
// 실제 한국 은행 알림 문구 예시로, Haiku가 뽑은 금액·이름이 원문에 그대로 있는지 검증하는
// 함수가 쉼표 섞인 실제 금액에서도 제대로 동작하는지 확인한다.
// (100원처럼 쉼표 없는 금액만 테스트하면 이 버그가 가려짐 — 반드시 1,000원 이상도 포함할 것)
import { classifyDirection, containsAmount, containsName, type DepositDirection } from "../src/lib/depositExtract.ts";

type Case = {
  label: string;
  rawText: string;
  amount: number;
  expected: boolean;
};

const amountCases: Case[] = [
  { label: "쉼표 있는 금액(50,000원)", rawText: "[카카오뱅크] 50,000원 입금 홍길동", amount: 50000, expected: true },
  { label: "쉼표 없는 금액(50000원)", rawText: "[국민은행] 50000원 입금 김철수", amount: 50000, expected: true },
  { label: "천원 단위 쉼표(3,000원)", rawText: "[신한] 3,000원 입금 이영희", amount: 3000, expected: true },
  { label: "100원(쉼표 없음, 기존 시험값)", rawText: "[토스] 100원 입금 박민수", amount: 100, expected: true },
  { label: "백만원대 쉼표 2번(1,234,000원)", rawText: "[우리은행] 1,234,000원 입금 최지훈", amount: 1234000, expected: true },
  {
    label: "한글 단위 표기(5만원) — 숫자로 안 적혀있어 안전하게 실패해야 함",
    rawText: "[농협] 5만원 입금되었습니다 정수진",
    amount: 50000,
    expected: false,
  },
  { label: "금액이 통째로 다름", rawText: "[카카오뱅크] 30,000원 입금 홍길동", amount: 50000, expected: false },
];

const nameCases: { label: string; rawText: string; name: string; expected: boolean }[] = [
  { label: "이름이 원문에 있음", rawText: "[카카오뱅크] 50,000원 입금 홍길동", name: "홍길동", expected: true },
  { label: "이름이 원문에 없음(엉뚱한 이름)", rawText: "[카카오뱅크] 50,000원 입금 홍길동", name: "김철수", expected: false },
];

const directionCases: { label: string; rawText: string; expected: DepositDirection }[] = [
  { label: "카카오뱅크 입금", rawText: "입금 32,000원 김영희 → 내 입출금통장 잔액 1,532,000원", expected: "IN" },
  { label: "받았어요 표현", rawText: "[토스] 김영희님에게 32,000원을 받았어요", expected: "IN" },
  { label: "출금(환불 송금)", rawText: "출금 32,000원 김영희 잔액 1,500,000원", expected: "OUT" },
  { label: "보냈어요 표현", rawText: "[토스] 김영희님에게 32,000원을 보냈어요", expected: "OUT" },
  { label: "카드 결제", rawText: "[카카오뱅크] 체크카드 32,000원 결제 승인", expected: "OUT" },
  { label: "광고·안내 알림", rawText: "이번 달 혜택을 확인해보세요", expected: "UNKNOWN" },
  { label: "입금·출금이 같이 있음", rawText: "출금 10,000원 / 입금 32,000원", expected: "UNKNOWN" },
];

let failed = 0;

for (const c of directionCases) {
  const actual = classifyDirection(c.rawText);
  const ok = actual === c.expected;
  if (!ok) failed++;
  console.log(`${ok ? "OK  " : "FAIL"} - classifyDirection: ${c.label} (기대 ${c.expected}, 실제 ${actual})`);
}

for (const c of amountCases) {
  const actual = containsAmount(c.rawText, c.amount);
  const ok = actual === c.expected;
  if (!ok) failed++;
  console.log(`${ok ? "OK  " : "FAIL"} - containsAmount: ${c.label} (기대 ${c.expected}, 실제 ${actual})`);
}

for (const c of nameCases) {
  const actual = containsName(c.rawText, c.name);
  const ok = actual === c.expected;
  if (!ok) failed++;
  console.log(`${ok ? "OK  " : "FAIL"} - containsName: ${c.label} (기대 ${c.expected}, 실제 ${actual})`);
}

if (failed > 0) {
  console.error(`\n실패 ${failed}건`);
  process.exit(1);
}
console.log("\n입금 검증 단위 테스트 전부 통과 ✓");
