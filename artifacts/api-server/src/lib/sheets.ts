import { ReplitConnectors } from "@replit/connectors-sdk";

const SHEET_ID = "1PfQfQXCxs31qS3B1sGRwS0VwkE3PGLEbVOvXVbdGFiI";

function getConnectors() {
  return new ReplitConnectors();
}

async function batchGetRanges(ranges: string[]) {
  const connectors = getConnectors();
  const encoded = ranges.map((r) => "ranges=" + encodeURIComponent(r)).join("&");
  const res = await connectors.proxy(
    "google-sheet",
    `/v4/spreadsheets/${SHEET_ID}/values:batchGet?${encoded}`,
    { method: "GET" }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.valueRanges as { range: string; values?: string[][] }[];
}

function parseSheet(values: string[][] | undefined) {
  if (!values || values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? "";
    });
    return obj;
  });
}

export async function getSheetData() {
  const sheets = [
    "Продукты!A1:Z100",
    "Культуры_и_сырье!A1:Z100",
    "Правила_дозирования!A1:Z100",
    "Пакеты_EGALIS!A1:Z100",
    "Цены!A1:Z100",
  ];
  const ranges = await batchGetRanges(sheets);
  return {
    products: parseSheet(ranges[0]?.values),
    cultures: parseSheet(ranges[1]?.values),
    rules: parseSheet(ranges[2]?.values),
    egalisPackages: parseSheet(ranges[3]?.values),
    prices: parseSheet(ranges[4]?.values),
  };
}

export interface HistoryRecord {
  dateTime: string;
  user?: string;
  client?: string;
  productCode: string;
  cultureCode: string;
  mass: number;
  moisture: number;
  method: string;
  dose: number;
  doseUnit: string;
  totalProduct: number;
  totalWater?: number;
  pumpLPH?: number;
  pumpLPM?: number;
  totalPrice?: number;
  comment?: string;
}

export async function appendHistory(record: HistoryRecord) {
  const connectors = getConnectors();
  const row = [
    record.dateTime,
    record.user ?? "",
    record.client ?? "",
    record.productCode,
    record.cultureCode,
    String(record.mass),
    String(record.moisture),
    record.method,
    String(record.dose),
    record.doseUnit,
    String(record.totalProduct),
    String(record.totalWater ?? ""),
    String(record.pumpLPH ?? ""),
    String(record.pumpLPM ?? ""),
    String(record.totalPrice ?? ""),
    record.comment ?? "",
    "синхронизировано",
  ];

  const res = await connectors.proxy(
    "google-sheet",
    `/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent("История_шаблон!A:Q")}:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values: [row] }),
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}
