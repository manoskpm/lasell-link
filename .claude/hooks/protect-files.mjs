// 라스켓 비밀·되돌릴 수 없는 파일 보호 훅 (PreToolUse) — v0.2 (GPT 41번 사전검토 반영, 대표 승인 2026-10-03 04:29)
// 목적: AI의 "실수"로 비밀·되돌릴 수 없는 파일이 고쳐지거나 지워지는 것을 줄이는 가드레일. 보안 잠금이 아님.
// 막히면: 무엇이 문제인지 + 어떻게 하면 되는지를 쉬운 말로 보여준다.
import { readFileSync, existsSync, realpathSync } from "node:fs";
import { resolve, relative, basename, sep, isAbsolute } from "node:path";
import { execFileSync } from "node:child_process";

const HOW = "꼭 바꿔야 하면 대표님이 직접 고치거나, 대표님 승인을 받은 뒤 보호 목록(.claude/hooks/protect-files.mjs)을 고쳐 주세요.";
function block(msg) { process.stderr.write(`[보호된 파일] ${msg}\n${HOW}\n`); process.exit(2); }

// 오류가 나면 조용히 통과시키지 않고 막는다(fail-closed). 훅이 고장 나면 쓰기 도구가 멈추지만, 그게 더 안전하다.
process.on("uncaughtException", (e) => block(`보호 장치가 확인 중 오류가 났어요(${String(e && e.message || e).slice(0, 80)}). 안전을 위해 이번 작업은 멈췄어요.`));

let input;
try { input = JSON.parse(readFileSync(0, "utf8")); }
catch { block("보호 장치가 이번 작업 내용을 읽지 못했어요. 안전을 위해 멈췄어요. 같은 작업을 한 번 더 시도해 주세요."); }

const project = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const tool = input.tool_name || "";
const ti = input.tool_input || {};
const norm = (p) => p.split(sep).join("/").replace(/\\/g, "/");

function isTracked(relPosix) {
  try { execFileSync("git", ["-C", project, "ls-files", "--error-unmatch", "--", relPosix], { stdio: "ignore", timeout: 4000 }); return true; }
  catch { return false; }
}
const DB = /\.(db|sqlite|sqlite3)(-journal|-wal|-shm)?$/i;
const KEY = /\.(jks|keystore|p12|pem)$/i;
function why(relPosix) {
  const name = basename(relPosix);
  if (relPosix === ".claude/settings.json" || relPosix === ".claude/settings.local.json" || relPosix.startsWith(".claude/hooks/"))
    return "보호 장치 자신(훅 설정·스크립트)이에요. 이게 바뀌면 보호가 꺼질 수 있어요.";
  if (/^\.env(\..+)?$/i.test(name) && name.toLowerCase() !== ".env.example") return "환경 비밀값 파일(.env)이라 API 키·설치 코드가 들어 있어요.";
  if (DB.test(name)) return "데이터베이스 파일이라 실제 회원·입금 계좌 정보가 들어 있어요.";
  if (name === "shot-settings.mjs") return "테스트 관리자 비밀번호가 든 파일이에요.";
  if (KEY.test(name)) return "앱 서명 키·인증서 파일이라 잃거나 바뀌면 되돌릴 수 없어요.";
  if (relPosix === "package-lock.json") return "패키지 잠금 파일은 npm 명령으로만 바뀌어야 해요(직접 고치면 설치가 꼬여요).";
  if (relPosix === "prisma/migrations/migration_lock.toml") return "DB 변경 기록 잠금 파일이에요.";
  if (relPosix.startsWith("prisma/migrations/") && isTracked(relPosix)) return "이미 저장소에 올라간 DB 변경 기록이에요. 바꾸면 배포된 DB와 어긋나요. 새 변경은 새 마이그레이션 폴더로 만들어 주세요.";
  return null;
}
function insideRel(abs) {
  const rel = relative(project, abs);
  if (rel === ".." || rel.startsWith(".." + sep) || isAbsolute(rel)) return null; // 저장소 밖(다른 드라이브 포함)
  return norm(rel);
}

if (["Edit", "Write", "MultiEdit", "NotebookEdit"].includes(tool)) {
  const fp = ti.file_path || ti.notebook_path;
  if (!fp) process.exit(0);
  const abs = resolve(project, String(fp).replace(/\\/g, sep));
  const candidates = [insideRel(abs)];
  if (existsSync(abs)) candidates.push(insideRel(realpathSync(abs))); // 바로가기(심볼릭 링크)로 보호 파일을 가리키는 경우
  for (const rel of candidates) { if (!rel) continue; const r = why(rel); if (r) block(`${rel} — ${r}`); }
  process.exit(0);
}

if (tool === "Bash" || tool === "PowerShell") {
  const cmd = String(ti.command || "");
  // 파일을 바꾸거나 지울 수 있는 명령(보수적으로 넓게). 보호 파일을 원본으로 복사만 하는 것도 막는다(정책: 보수적 차단).
  const writes = new RegExp([
    String.raw`(^|[\s;&|(])(rm|mv|cp|tee|truncate|dd|shred|install|rsync|tar|unzip|ln)\s`,
    String.raw`>`,
    String.raw`\bsed\s+(-[a-zA-Z]*i|--in-place)`, String.raw`\bperl\s+-[a-zA-Z]*i`,
    String.raw`\bfind\b.*\s-(delete|exec)`,
    String.raw`\bgit\s+(restore|checkout|reset|clean|rm|mv|stash)\b`,
    String.raw`\b(python3?|node|ruby|perl|deno|bun)\b`, // 스크립트로 직접 쓰기 — 보호 파일 이름이 함께 있으면 막음
    // PowerShell
    String.raw`\b(Remove-Item|Set-Content|Add-Content|Clear-Content|Out-File|Copy-Item|Move-Item|Rename-Item|New-Item)\b`,
    String.raw`(^|[\s;|(])(del|erase|ri|rd|rmdir|copy|move|ren|sc|ac)\s`,
  ].join("|"), "i");
  const B = "(?=$|[\\s'\"`;|&)\\\\])";
  const targets = [
    [new RegExp(String.raw`\.claude[\\/](settings(\.local)?\.json|hooks)`, "i"), "보호 장치 자신(.claude 훅 설정·스크립트)"],
    [new RegExp(String.raw`(^|[\s'"=\\/])\.env(?!\.example)(\.[\w.-]+)?` + B, "i"), "환경 비밀값 파일(.env)"],
    [new RegExp(String.raw`\.(db|sqlite|sqlite3)(-journal|-wal|-shm)?` + B, "i"), "데이터베이스 파일"],
    [/shot-settings\.mjs/i, "테스트 관리자 비밀번호 파일"],
    [new RegExp(String.raw`\.(jks|keystore|p12|pem)` + B, "i"), "앱 서명 키·인증서 파일"],
    [/prisma[\\/]migrations[\\/]/i, "DB 변경 기록 폴더(prisma/migrations)"],
    [/package-lock\.json/i, "패키지 잠금 파일"],
  ];
  if (writes.test(cmd)) {
    for (const [re, label] of targets) if (re.test(cmd)) block(`명령이 ${label}을(를) 바꾸거나 지울 수 있어요: ${cmd.slice(0, 120)}`);
  }
  process.exit(0);
}
process.exit(0);
