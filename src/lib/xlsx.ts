import ExcelJS from "exceljs";

export type SheetColumn = { header: string; key: string; width?: number };

/// 관리자 다운로드용 엑셀 만들기 (제목줄 고정 + 줄바꿈 표시)
export async function buildSheet({
  sheetName,
  columns,
  rows,
}: {
  sheetName: string;
  columns: SheetColumn[];
  rows: Record<string, string | number | null>[];
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  sheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width ?? 16,
  }));

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEFEFEF" },
  };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  rows.forEach((data) => {
    const row = sheet.addRow(data);
    let lines = 1;
    row.eachCell((cell) => {
      if (typeof cell.value === "string" && cell.value.includes("\n")) {
        cell.alignment = { wrapText: true, vertical: "top" };
        lines = Math.max(lines, cell.value.split("\n").length);
      }
    });
    if (lines > 1) row.height = lines * 15;
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export function xlsxResponse(
  buffer: Buffer,
  filename: string,
  asciiFallback: string
) {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": contentDisposition(filename, asciiFallback),
    },
  });
}

/// 한글 파일명은 filename*로 보내고, 한글을 못 읽는 환경을 위해 영문 이름도 같이 보냄
export function contentDisposition(filename: string, asciiFallback: string) {
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
