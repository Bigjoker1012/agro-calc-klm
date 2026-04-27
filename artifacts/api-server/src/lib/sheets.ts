import { google } from "googleapis";
import { readFileSync } from "fs";
import { resolve } from "path";

const SHEET_ID = "1PfQfQXCxs31qS3B1sGRwS0VwkE3PGLEbVOvXVbdGFiI";

function getAuth() {
  let credentials: object | undefined;

  // 1. Try environment variable
  const envJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (envJson) {
    try {
      credentials = JSON.parse(envJson);
    } catch {
      // invalid JSON in env var — fall through to file
    }
  }

  // 2. Fallback: read key file from project root (Replit dev environment)
  if (!credentials) {
    try {
      const filePath = resolve(
        process.cwd(),
        "../../attached_assets/agro-calc-klm-851be2dde7cc_1777293560241.json"
      );
      credentials = JSON.parse(readFileSync(filePath, "utf-8"));
    } catch {
      // file not found or invalid
    }
  }

  if (!credentials) {
    throw new Error(
      "Google service account credentials не найдены. " +
      "Установите секрет GOOGLE_SERVICE_ACCOUNT_JSON."
    );
  }

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSheets() {
  return google.sheets({ version: "v4", auth: getAuth() });
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
  const sheets = getSheets();
  const ranges = [
    "Продукты!A1:Z100",
    "Культуры_и_сырье!A1:Z100",
    "Правила_дозирования!A1:Z100",
    "Пакеты_EGALIS!A1:Z100",
    "Цены!A1:Z100",
  ];
  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: SHEET_ID,
    ranges,
  });
  const valueRanges = res.data.valueRanges ?? [];
  return {
    products:      parseSheet(valueRanges[0]?.values as string[][] | undefined),
    cultures:      parseSheet(valueRanges[1]?.values as string[][] | undefined),
    rules:         parseSheet(valueRanges[2]?.values as string[][] | undefined),
    egalisPackages:parseSheet(valueRanges[3]?.values as string[][] | undefined),
    prices:        parseSheet(valueRanges[4]?.values as string[][] | undefined),
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

export async function getHistory(limit = 100): Promise<HistoryRecord[]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "История_шаблон!A:Q",
  });
  const values = res.data.values as string[][] | undefined;
  if (!values || values.length < 2) return [];
  const rows = values.slice(1).filter((r) => r.some((c) => c?.trim()));
  return rows
    .slice(-limit)
    .reverse()
    .map((row) => ({
      dateTime:     row[0]  ?? "",
      user:         row[1]  ?? "",
      client:       row[2]  ?? "",
      productCode:  row[3]  ?? "",
      cultureCode:  row[4]  ?? "",
      mass:         parseFloat(row[5]  ?? "0") || 0,
      moisture:     parseFloat(row[6]  ?? "0") || 0,
      method:       row[7]  ?? "",
      dose:         parseFloat(row[8]  ?? "0") || 0,
      doseUnit:     row[9]  ?? "",
      totalProduct: parseFloat(row[10] ?? "0") || 0,
      totalWater:   parseFloat(row[11] ?? "0") || undefined,
      pumpLPH:      parseFloat(row[12] ?? "0") || undefined,
      pumpLPM:      parseFloat(row[13] ?? "0") || undefined,
      totalPrice:   parseFloat(row[14] ?? "0") || undefined,
      comment:      row[15] ?? "",
    }));
}

export async function appendHistory(record: HistoryRecord) {
  const sheets = getSheets();
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
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "История_шаблон!A:Q",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
  return res.data;
}
