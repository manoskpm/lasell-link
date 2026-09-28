import { platformApiGuard } from "@/lib/access";
import { contentDisposition } from "@/lib/xlsx";
import { createDbBackup } from "@/lib/dbBackup";

/// Railway 볼륨 자체 백업과 별개로, 운영자가 직접 내려받아 따로 보관하는 이중 안전장치.
export async function GET() {
  const denied = await platformApiGuard();
  if (denied) return denied;

  const buffer = await createDbBackup();
  const today = new Date().toISOString().slice(0, 10);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/x-sqlite3",
      "Content-Disposition": contentDisposition(
        `라스켓_백업_${today}.db`,
        `lasket-backup-${today}.db`
      ),
    },
  });
}
