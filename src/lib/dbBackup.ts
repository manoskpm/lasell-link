/// Railway 볼륨 자체 백업과는 별개로, 운영자가 직접 내려받아 보관할 수 있는
/// DB 스냅샷. better-sqlite3의 온라인 백업 기능을 써서 서버가 계속 돌고 있어도
/// (트랜잭션 중이어도) 안전한 복사본을 만든다.
import Database from "better-sqlite3";
import { mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";

function dbFilePath(): string {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  return url.replace(/^file:/, "");
}

export async function createDbBackup(): Promise<Buffer> {
  const dir = await mkdtemp(path.join(tmpdir(), "lasket-backup-"));
  const destPath = path.join(dir, "backup.db");
  const db = new Database(dbFilePath(), { readonly: true, fileMustExist: true });
  try {
    await db.backup(destPath);
  } finally {
    db.close();
  }
  try {
    return await readFile(destPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
