import ExcelJS from "exceljs";

export type CourierField =
  | "orderNo"
  | "receiverName"
  | "receiverPhone"
  | "receiverPhone2"
  | "zipcode"
  | "address"
  | "productName"
  | "quantity"
  | "memo"
  | "senderName"
  | "senderPhone"
  | "senderZipcode"
  | "senderAddress"
  | "trackingNumber";

export type FieldDef = {
  key: CourierField;
  label: string;
  keywords: string[];
};

/// 택배사 양식마다 헤더 이름이 다르기 때문에 흔히 쓰이는 표현을 모아 자동 인식에 사용
export const FIELD_DEFS: FieldDef[] = [
  {
    key: "receiverName",
    label: "받는분 이름",
    keywords: [
      "받는분성명",
      "받는분이름",
      "받는분",
      "받으실분",
      "수하인명",
      "수하인",
      "수취인명",
      "수취인",
      "도착점명",
      "고객명",
      "성명",
      "이름",
    ],
  },
  {
    key: "receiverPhone",
    label: "받는분 연락처",
    keywords: [
      "받는분전화번호",
      "받는분휴대폰",
      "받는분연락처",
      "수하인전화",
      "수하인연락처",
      "수취인전화",
      "휴대폰번호",
      "휴대폰",
      "핸드폰",
      "전화번호1",
      "전화번호",
      "연락처1",
      "연락처",
    ],
  },
  {
    key: "receiverPhone2",
    label: "받는분 추가 연락처",
    keywords: ["전화번호2", "연락처2", "기타전화", "일반전화", "추가연락처"],
  },
  {
    key: "zipcode",
    label: "우편번호",
    keywords: ["받는분우편번호", "우편번호", "도착지우편번호", "zip"],
  },
  {
    key: "address",
    label: "주소",
    keywords: [
      "받는분주소",
      "받는분상세주소",
      "도착지주소",
      "배송지주소",
      "배송주소",
      "주소",
    ],
  },
  {
    key: "productName",
    label: "품목명",
    keywords: [
      "품목명",
      "상품명",
      "품명",
      "내품명",
      "내용물",
      "품목",
      "상품",
      "물품명",
    ],
  },
  {
    key: "quantity",
    label: "수량",
    keywords: ["수량", "박스수량", "개수", "내품수량"],
  },
  {
    key: "memo",
    label: "배송메시지",
    keywords: [
      "배송메시지",
      "배송메세지",
      "전달사항",
      "요청사항",
      "배송요청",
      "메시지",
      "메세지",
      "비고",
      "메모",
    ],
  },
  {
    key: "orderNo",
    label: "주문번호",
    keywords: [
      "주문번호",
      "고객관리번호",
      "관리번호",
      "주문관리번호",
      "고객주문번호",
      "출고번호",
    ],
  },
  {
    key: "trackingNumber",
    label: "운송장번호",
    keywords: ["운송장번호", "운송장", "송장번호", "송장", "invoice"],
  },
  {
    key: "senderName",
    label: "보내는분 이름",
    keywords: ["보내는분성명", "보내는분이름", "보내는분", "송하인명", "송하인", "발송인"],
  },
  {
    key: "senderPhone",
    label: "보내는분 연락처",
    keywords: [
      "보내는분전화번호",
      "보내는분연락처",
      "보내는분휴대폰",
      "송하인전화",
      "송하인연락처",
      "발송인전화",
    ],
  },
  {
    key: "senderZipcode",
    label: "보내는분 우편번호",
    keywords: ["보내는분우편번호", "송하인우편번호", "발송지우편번호"],
  },
  {
    key: "senderAddress",
    label: "보내는분 주소",
    keywords: ["보내는분주소", "송하인주소", "발송지주소", "발송인주소"],
  },
];

export type ColumnMapping = Partial<Record<CourierField, number>>;

const SENDER_FIELDS: CourierField[] = [
  "senderName",
  "senderPhone",
  "senderZipcode",
  "senderAddress",
];

function normalize(text: string) {
  return text.replace(/[\s()[\]{}*_\-/.,:]/g, "").toLowerCase();
}

/// 엑셀 헤더 문자열 배열(1번째 원소 = 1열)을 보고 각 필드가 몇 번째 열인지 추측
export function detectMapping(headers: (string | null)[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const scores = new Map<CourierField, number>();

  headers.forEach((rawHeader, index) => {
    if (!rawHeader) return;
    const header = normalize(rawHeader);
    if (!header) return;

    const isSenderHeader = /보내는|송하인|발송인/.test(rawHeader);

    let best: { field: CourierField; score: number } | null = null;
    for (const def of FIELD_DEFS) {
      const fieldIsSender = SENDER_FIELDS.includes(def.key);
      // '보내는분 전화'가 '받는분 전화'로 잡히는 것을 막음
      if (isSenderHeader !== fieldIsSender) continue;

      for (const keyword of def.keywords) {
        const key = normalize(keyword);
        if (!header.includes(key)) continue;
        // 더 긴 키워드가 더 구체적인 표현이므로 우선
        if (!best || key.length > best.score) {
          best = { field: def.key, score: key.length };
        }
        break;
      }
    }

    if (!best) return;
    const previous = scores.get(best.field) ?? 0;
    if (mapping[best.field] === undefined || best.score > previous) {
      mapping[best.field] = index + 1;
      scores.set(best.field, best.score);
    }
  });

  return mapping;
}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("").trim();
    }
    if ("text" in value && typeof value.text === "string") {
      return value.text.trim();
    }
    if ("result" in value) return cellText(value.result as ExcelJS.CellValue);
  }
  return "";
}

export type SheetInfo = {
  sheetName: string;
  headerRow: number;
  headers: string[];
};

async function loadWorkbook(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  // exceljs 타입이 Node Buffer 대신 자체 Buffer 타입을 요구해서 캐스팅
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  return workbook;
}

/// 양식 파일에서 헤더가 있는 행과 헤더 이름들을 찾아냄
export async function readSheetInfo(
  buffer: Buffer,
  sheetName?: string | null
): Promise<SheetInfo> {
  const workbook = await loadWorkbook(buffer);
  const sheet = sheetName
    ? (workbook.getWorksheet(sheetName) ?? workbook.worksheets[0])
    : workbook.worksheets[0];

  if (!sheet) throw new Error("엑셀에서 시트를 찾을 수 없어요.");

  let headerRow = 1;
  let headers: string[] = [];
  const searchLimit = Math.min(sheet.rowCount || 1, 15);

  for (let rowNumber = 1; rowNumber <= searchLimit; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const values: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      values[colNumber - 1] = cellText(cell.value);
    });
    const filled = values.filter(Boolean).length;
    if (filled >= 2) {
      headerRow = rowNumber;
      headers = values;
      break;
    }
  }

  return {
    sheetName: sheet.name,
    headerRow,
    headers: headers.map((header) => header ?? ""),
  };
}

export type SheetRows = SheetInfo & { rows: string[][] };

/// 헤더 + 데이터 행 전체를 문자열로 읽어옴 (송장번호 회수용)
export async function readSheetRows(
  buffer: Buffer,
  sheetName?: string | null
): Promise<SheetRows> {
  const info = await readSheetInfo(buffer, sheetName);
  const workbook = await loadWorkbook(buffer);
  const sheet = workbook.getWorksheet(info.sheetName) ?? workbook.worksheets[0];
  const rows: string[][] = [];

  sheet?.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= info.headerRow) return;
    const values: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      values[colNumber - 1] = cellText(cell.value);
    });
    if (values.some(Boolean)) rows.push(values);
  });

  return { ...info, rows };
}

export type ExportRow = Partial<Record<CourierField, string | number>>;

/// 택배사 양식 파일을 그대로 열어서 데이터 행만 채워 새 엑셀 버퍼로 돌려줌
export async function fillTemplate({
  templateBuffer,
  sheetName,
  startRow,
  mapping,
  rows,
}: {
  templateBuffer: Buffer;
  sheetName?: string | null;
  startRow: number;
  mapping: ColumnMapping;
  rows: ExportRow[];
}): Promise<Buffer> {
  const workbook = await loadWorkbook(templateBuffer);
  const sheet = sheetName
    ? (workbook.getWorksheet(sheetName) ?? workbook.worksheets[0])
    : workbook.worksheets[0];

  if (!sheet) throw new Error("엑셀에서 시트를 찾을 수 없어요.");

  rows.forEach((data, index) => {
    const row = sheet.getRow(startRow + index);
    let maxLines = 1;

    for (const [field, column] of Object.entries(mapping)) {
      if (!column) continue;
      const value = data[field as CourierField];
      if (value === undefined) continue;

      const cell = row.getCell(column);
      cell.value = value;

      // 여러 품목을 줄바꿈으로 넣은 칸은 엑셀에서도 줄바꿈이 보이도록 설정
      if (typeof value === "string" && value.includes("\n")) {
        cell.alignment = { wrapText: true, vertical: "top" };
        maxLines = Math.max(maxLines, value.split("\n").length);
      }
    }

    if (maxLines > 1) row.height = maxLines * 15;
    row.commit();
  });

  const output = await workbook.xlsx.writeBuffer();
  return Buffer.from(output);
}

/// 송장 품목란 한 줄. 배송팀이 보고 바로 포장할 수 있게 품명/사이즈/색상/수량을 나눠 적음
export function itemLine({
  productName,
  size,
  color,
  quantity,
}: {
  productName: string;
  size?: string | null;
  color?: string | null;
  quantity: number;
}) {
  return [productName, size, color, `${quantity}개`].filter(Boolean).join(" / ");
}

export function parseMapping(raw: string): ColumnMapping {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
