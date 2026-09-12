import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const PRIVATE_DIR = path.join(process.cwd(), "data", "templates");

/// 업로드된 이미지를 public/uploads 에 저장하고 웹 경로를 돌려줌
export async function saveUploadedImage(
  file: File | null
): Promise<string | null> {
  if (!file || file.size === 0) return null;

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const ext = path.extname(file.name) || ".jpg";
  const filename = `${randomUUID()}${ext}`;
  await writeFile(
    path.join(uploadDir, filename),
    Buffer.from(await file.arrayBuffer())
  );

  return `/uploads/${filename}`;
}

/// 택배사 양식 파일은 계약정보가 담겨있을 수 있어 공개 폴더 대신 data/ 아래에 저장
export async function savePrivateFile(file: File): Promise<string> {
  await mkdir(PRIVATE_DIR, { recursive: true });

  const ext = path.extname(file.name) || ".xlsx";
  const filename = `${randomUUID()}${ext}`;
  await writeFile(
    path.join(PRIVATE_DIR, filename),
    Buffer.from(await file.arrayBuffer())
  );

  return filename;
}

export function readPrivateFile(filename: string) {
  // 경로 조작 방지: 파일명만 사용
  return readFile(path.join(PRIVATE_DIR, path.basename(filename)));
}
