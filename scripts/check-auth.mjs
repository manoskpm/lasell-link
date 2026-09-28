// 권한 검사 누락 점검: npm run check:auth
// 서버 액션·API·셀러 화면·운영자 화면에 권한 검사가 빠진 곳이 있으면 실패한다.
// 새 기능을 추가했으면 배포 전에 꼭 돌릴 것.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const GUARDS = [
  "requireSellerConsole(",
  "requirePlatform(",
  "requireUser(",
  "getCurrentUser(",
  "getAccess(",
  "sellerConsoleApiGuard(",
  "sellerConsoleShopApiGuard(",
  "requireOwnShop(",
  "platformApiGuard(",
];

// 로그인 전에도 불러야 하는 것만 여기에 (이유를 같이 적을 것)
const PUBLIC_ACTIONS = new Set([
  "signupAction", // 가입
  "loginAction", // 로그인
  "logoutAction", // 로그아웃
  "platformSetupAction", // 운영자 설치: 설치 코드로 따로 검사
  "isSetupCodeConfigured", // 설치 화면 열림 여부 (값은 노출 안 함)
]);
const PUBLIC_API = new Set([
  "src/app/api/presence/route.ts", // 손님 접속 표시 (개인정보 없음)
  "src/app/api/notify/deposit/[shopSlug]/route.ts", // 셀러 폰(앱/단축어) 호출: 세션 대신 상점별 비밀키로 검사
]);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const problems = [];
// 함수 시작부터 다음 export 직전까지만 본다 (다음 함수의 검사를 잘못 세지 않게)
const bodyAfter = (src, index) => {
  const next = src.indexOf("\nexport ", index + 1);
  const end = next === -1 ? src.length : next;
  return src.slice(index, Math.min(end, index + 1200));
};

// 1) 서버 액션: 내보낸 함수마다 첫 부분에 검사가 있어야 함
for (const file of walk("src/app/actions").filter((f) => f.endsWith(".ts"))) {
  const src = readFileSync(file, "utf8");
  for (const match of src.matchAll(/export async function (\w+)\s*\(/g)) {
    const name = match[1];
    if (PUBLIC_ACTIONS.has(name)) continue;
    if (!GUARDS.some((g) => bodyAfter(src, match.index).includes(g))) {
      problems.push(`서버 액션 ${file} → ${name}()`);
    }
  }
}

// 2) API 경로
for (const file of walk("src/app/api").filter((f) => f.endsWith("route.ts"))) {
  if (PUBLIC_API.has(file)) continue;
  const src = readFileSync(file, "utf8");
  for (const match of src.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)\s*\(/g)) {
    if (!GUARDS.some((g) => bodyAfter(src, match.index).includes(g))) {
      problems.push(`API ${file} → ${match[1]}`);
    }
  }
}

// 3) 화면: 셀러 화면은 requireSellerConsole 또는 상점 정보까지 같이 주는 requireOwnShop,
//    운영자 화면은 requirePlatform
const pageRules = [
  { dir: "src/app/admin", guards: ["requireSellerConsole(", "requireOwnShop("] },
  { dir: "src/app/platform/(console)", guards: ["requirePlatform("] },
];
for (const { dir, guards } of pageRules) {
  for (const file of walk(dir).filter((f) => /(page|layout)\.tsx$/.test(f))) {
    const src = readFileSync(file, "utf8");
    if (!guards.some((guard) => src.includes(guard))) {
      const label = guards.map((g) => g.slice(0, -1)).join(" 또는 ");
      problems.push(`화면 ${file} (${label} 없음)`);
    }
  }
}

// 4) "use server" 파일은 async 함수만 내보낼 수 있다. 상수를 내보내면 화면이 500 오류로 멈춘다
for (const file of walk("src/app/actions").filter((f) => f.endsWith(".ts"))) {
  const src = readFileSync(file, "utf8");
  if (!src.includes('"use server"')) continue;
  for (const match of src.matchAll(/^export (?!async function|type |interface )(\w+)/gm)) {
    problems.push(`서버 기능 파일 ${file} → "export ${match[1]}" (상수·일반 함수는 src/lib 로 옮길 것)`);
  }
}

// 5) 운영자 기능 파일은 반드시 requirePlatform 으로 검사
{
  const file = "src/app/actions/platform.ts";
  const src = readFileSync(file, "utf8");
  for (const match of src.matchAll(/export async function (\w+)\s*\(/g)) {
    if (PUBLIC_ACTIONS.has(match[1])) continue;
    if (!bodyAfter(src, match.index).includes("requirePlatform(")) {
      problems.push(`운영자 기능 ${file} → ${match[1]}() 에 requirePlatform 없음`);
    }
  }
}

if (problems.length > 0) {
  console.error(`권한 검사가 빠진 곳 ${problems.length}개:`);
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
console.log("권한 검사 누락 없음 ✓");
