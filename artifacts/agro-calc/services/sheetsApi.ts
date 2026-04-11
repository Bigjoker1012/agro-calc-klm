import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import type { CalculationResult } from "@/utils/calculator";

const CACHE_KEY = "sheets_data_cache_v1";
const SYNC_STATUS_KEY = "sheets_sync_status_v1";
const UNSYNCED_KEY = "sheets_unsynced_v1";

function getApiBase(): string {
  // On web: use the same origin the app was loaded from (works with any domain)
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.origin}/api`;
  }
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}/api`;
  return "http://localhost:8080/api";
}

export interface SyncStatus {
  connected: boolean;
  lastSync: string | null;
  unsyncedCount: number;
  lastError: string | null;
}

export async function getSyncStatus(): Promise<SyncStatus> {
  try {
    const raw = await AsyncStorage.getItem(SYNC_STATUS_KEY);
    const unsynced = await AsyncStorage.getItem(UNSYNCED_KEY);
    const count = unsynced ? (JSON.parse(unsynced) as unknown[]).length : 0;
    if (raw) {
      const saved = JSON.parse(raw) as SyncStatus;
      return { ...saved, unsyncedCount: count };
    }
    return { connected: false, lastSync: null, unsyncedCount: count, lastError: null };
  } catch {
    return { connected: false, lastSync: null, unsyncedCount: 0, lastError: null };
  }
}

async function saveSyncStatus(status: Omit<SyncStatus, "unsyncedCount">) {
  await AsyncStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(status));
}

export async function syncSheetData(): Promise<boolean> {
  try {
    const res = await fetch(`${getApiBase()}/sheets/data`, { method: "GET" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.ok) {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ data: json.data, cachedAt: new Date().toISOString() }));
      await saveSyncStatus({ connected: true, lastSync: new Date().toISOString(), lastError: null });
      return true;
    }
    throw new Error(json.error ?? "Unknown error");
  } catch (err: any) {
    await saveSyncStatus({ connected: false, lastSync: null, lastError: err.message });
    return false;
  }
}

export async function queueHistoryRecord(result: CalculationResult): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(UNSYNCED_KEY);
    const queue: CalculationResult[] = raw ? JSON.parse(raw) : [];
    queue.push(result);
    await AsyncStorage.setItem(UNSYNCED_KEY, JSON.stringify(queue));
  } catch {}
}

export interface ServerHistoryRecord {
  dateTime: string;
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

export async function fetchServerHistory(limit = 100): Promise<ServerHistoryRecord[]> {
  try {
    const res = await fetch(`${getApiBase()}/sheets/history?limit=${limit}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.ok && Array.isArray(json.records)) return json.records as ServerHistoryRecord[];
    throw new Error(json.error ?? "Unknown error");
  } catch {
    return [];
  }
}

export async function flushHistoryToSheets(): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  try {
    const raw = await AsyncStorage.getItem(UNSYNCED_KEY);
    if (!raw) return { sent: 0, failed: 0 };
    const queue: CalculationResult[] = JSON.parse(raw);
    if (queue.length === 0) return { sent: 0, failed: 0 };

    const remaining: CalculationResult[] = [];
    for (const r of queue) {
      try {
        const methodMap: Record<string, string> = {
          combine: "через комбайн",
          sprayer: "опрыскиватель",
          manual: "ручное",
        };
        const body = {
          dateTime: r.timestamp,
          productCode: r.product.code ?? r.product.id,
          cultureCode: r.input.culture,
          mass: r.input.mass,
          moisture: r.input.moisture,
          method: methodMap[r.input.method] ?? r.input.method,
          dose: r.dose,
          doseUnit: r.rule.unit,
          totalProduct: r.totalLiters ?? r.totalKg * 1000,
          totalWater: r.solutionLiters,
          pumpLPH: r.pumpLPH,
          pumpLPM: r.pumpLPH / 60,
          totalPrice: r.totalCost,
          comment: r.rule.recommendation ?? "",
        };
        const res = await fetch(`${getApiBase()}/sheets/history`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) { sent++; } else { remaining.push(r); failed++; }
      } catch {
        remaining.push(r);
        failed++;
      }
    }
    await AsyncStorage.setItem(UNSYNCED_KEY, JSON.stringify(remaining));
  } catch {}
  return { sent, failed };
}
