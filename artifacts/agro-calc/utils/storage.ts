import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CalculationResult } from "./calculator";

const HISTORY_KEY = "agro_calc_history_v1";
const UNSYNCED_KEY = "sheets_unsynced_v1";

export async function saveCalculation(
  result: CalculationResult
): Promise<void> {
  const existing = await loadHistory();
  const updated = [result, ...existing].slice(0, 200);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export async function loadHistory(): Promise<CalculationResult[]> {
  try {
    const data = await AsyncStorage.getItem(HISTORY_KEY);
    return data ? (JSON.parse(data) as CalculationResult[]) : [];
  } catch {
    return [];
  }
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.multiRemove([HISTORY_KEY, UNSYNCED_KEY]);
}
