import { PRODUCTS, RULES, type Product, type Rule } from "../constants/mockData";

export interface CalculationInput {
  culture: string;
  mass: number;
  moisture: number;
  method: "combine" | "sprayer" | "manual";
  speed: number;
  egalisScheme: 2 | 8;
}

export interface CalculationResult {
  product: Product;
  rule: Rule;
  dose: number;
  doseDisplay: string;
  reason: string;
  totalLiters?: number;
  totalKg: number;
  totalCost: number;
  pumpLPH: number;
  pumpUnit: "л/ч" | "мл/ч";
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

function getMoistureLabel(moisture: number): string {
  if (moisture < 35) return "низкая влажность";
  if (moisture < 55) return "средняя влажность";
  if (moisture < 70) return "высокая влажность";
  return "очень высокая влажность";
}

function buildReason(rule: Rule, moisture: number): string {
  const name = rule.culture.toLowerCase();
  const hasRange = !(rule.moistureMin === 0 && rule.moistureMax === 100);
  if (hasRange) {
    return `${name} + ${getMoistureLabel(moisture)}`;
  }
  return name;
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

  const reason = buildReason(rule, input.moisture);

  let totalLiters: number | undefined;
  let totalKg: number;
  let totalCost: number;
  let pumpLPH: number;
  let pumpUnit: "л/ч" | "мл/ч";
  let totalPacks: number | undefined;
  let solutionLiters: number | undefined;
  let solutionSchemeDisplay: string | undefined;

  if (product.id === "silkorm") {
    totalLiters = round(dose * input.mass, 1);
    totalKg = round(totalLiters * (product.density ?? 1.2), 2);
    totalCost = round(totalKg * product.price, 2);
    const rawLPH = dose * input.speed;
    if (rawLPH < 1) {
      pumpLPH = round(rawLPH * 1000, 1);
      pumpUnit = "мл/ч";
    } else {
      pumpLPH = round(rawLPH, 1);
      pumpUnit = "л/ч";
    }
  } else {
    const doseKgPerT = rule.doseMin / 1000;
    totalKg = round(doseKgPerT * input.mass, 4);
    totalCost = round(totalKg * product.price, 2);
    totalPacks = Math.ceil((totalKg * 1000) / (product.packSizeG ?? 50));
    solutionLiters = round(input.egalisScheme * input.mass, 1);
    solutionSchemeDisplay =
      input.egalisScheme === 2
        ? "1 пакет (50 г) на 50 л воды → 2 л/т"
        : "1 пакет (50 г) на 200 л воды → 8 л/т";
    const rawLPH = input.egalisScheme * input.speed;
    if (rawLPH < 1) {
      pumpLPH = round(rawLPH * 1000, 1);
      pumpUnit = "мл/ч";
    } else {
      pumpLPH = round(rawLPH, 1);
      pumpUnit = "л/ч";
    }
  }

  const id =
    Date.now().toString() + Math.random().toString(36).substring(2, 9);

  return {
    product,
    rule,
    dose,
    doseDisplay,
    reason,
    totalLiters,
    totalKg,
    totalCost,
    pumpLPH,
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

export function buildShareText(result: CalculationResult): string {
  const methodNames: Record<string, string> = {
    combine: "Через комбайн",
    sprayer: "Опрыскиватель",
    manual: "Ручное внесение",
  };
  const lines = [
    "AgroCalc КЛМ — Расчёт консерванта",
    "",
    `Культура: ${result.input.culture}`,
    `Масса: ${result.input.mass} т  |  Влажность: ${result.input.moisture}%`,
    `Способ: ${methodNames[result.input.method] ?? result.input.method}`,
    "",
    "РЕКОМЕНДАЦИЯ:",
    `Продукт: ${result.product.name}`,
    `Норма: ${result.doseDisplay} ${result.rule.unit}`,
    result.totalLiters !== undefined
      ? `Итого препарата: ${result.totalLiters} л`
      : `Итого препарата: ${(result.totalKg * 1000).toFixed(0)} г`,
    result.totalPacks !== undefined
      ? `Пакетов (50 г): ${result.totalPacks} шт.`
      : "",
    `Настройка дозатора: ${result.pumpLPH} ${result.pumpUnit}`,
    `Цена партии: ${formatCurrency(result.totalCost)} BYN`,
  ];
  return lines.filter(Boolean).join("\n");
}
