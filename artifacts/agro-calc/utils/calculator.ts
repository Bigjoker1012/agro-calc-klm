import { PRODUCTS, RULES, type Product, type Rule } from "../constants/mockData";

export interface CalculationInput {
  culture: string;
  mass: number;
  moisture: number;
  method: "combine" | "sprayer";
  speed: number;
  egalisScheme: 2 | 8;
}

export interface CalculationResult {
  product: Product;
  rule: Rule;
  dose: number;
  doseDisplay: string;
  totalLiters?: number;
  totalKg: number;
  totalCost: number;
  pumpSetting: number;
  pumpUnit: "л/мин" | "мл/мин";
  totalPacks?: number;
  solutionLiters?: number;
  solutionSchemeDisplay?: string;
  input: CalculationInput;
  timestamp: string;
  id: string;
}

export function findRule(culture: string, moisture: number): Rule | null {
  const match = RULES.find(
    (r) =>
      r.culture === culture &&
      moisture >= r.moistureMin &&
      moisture <= r.moistureMax
  );
  return match ?? null;
}

export function hasMatchingRule(culture: string, moisture: number): boolean {
  return findRule(culture, moisture) !== null;
}

export function calculate(input: CalculationInput): CalculationResult | null {
  const rule = findRule(input.culture, input.moisture);
  if (!rule) return null;

  const product = PRODUCTS.find((p) => p.id === rule.productId);
  if (!product) return null;

  const dose = (rule.doseMin + rule.doseMax) / 2;
  const doseDisplay =
    rule.doseMin === rule.doseMax
      ? `${rule.doseMin}`
      : `${rule.doseMin}–${rule.doseMax}`;

  let totalLiters: number | undefined;
  let totalKg: number;
  let totalCost: number;
  let pumpSetting: number;
  let pumpUnit: "л/мин" | "мл/мин";
  let totalPacks: number | undefined;
  let solutionLiters: number | undefined;
  let solutionSchemeDisplay: string | undefined;

  if (product.id === "silkorm") {
    totalLiters = round(dose * input.mass, 2);
    totalKg = round(totalLiters * (product.density ?? 1.2), 2);
    totalCost = round(totalKg * product.price, 2);
    const pumpLPM = (dose * input.speed) / 60;
    if (pumpLPM < 1) {
      pumpSetting = round(pumpLPM * 1000, 1);
      pumpUnit = "мл/мин";
    } else {
      pumpSetting = round(pumpLPM, 1);
      pumpUnit = "л/мин";
    }
  } else {
    const doseKgPerT = rule.doseMin / 1000;
    totalKg = round(doseKgPerT * input.mass, 4);
    totalCost = round(totalKg * product.price, 2);
    totalPacks = Math.ceil((totalKg * 1000) / (product.packSizeG ?? 50));
    solutionLiters = round(input.egalisScheme * input.mass, 1);
    solutionSchemeDisplay =
      input.egalisScheme === 2
        ? "1 пакет (50 г) на 50 л воды → 2 л/т раствора"
        : "1 пакет (50 г) на 200 л воды → 8 л/т раствора";
    const pumpLPM = (input.egalisScheme * input.speed) / 60;
    if (pumpLPM < 1) {
      pumpSetting = round(pumpLPM * 1000, 1);
      pumpUnit = "мл/мин";
    } else {
      pumpSetting = round(pumpLPM, 1);
      pumpUnit = "л/мин";
    }
  }

  const id =
    Date.now().toString() + Math.random().toString(36).substring(2, 9);

  return {
    product,
    rule,
    dose,
    doseDisplay,
    totalLiters,
    totalKg,
    totalCost,
    pumpSetting,
    pumpUnit,
    totalPacks,
    solutionLiters,
    solutionSchemeDisplay,
    input,
    timestamp: new Date().toISOString(),
    id,
  };
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export function formatCurrency(value: number): string {
  return value.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
