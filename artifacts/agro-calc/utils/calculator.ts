import { PRODUCTS, RULES, type Product, type Rule } from "../constants/mockData";

export type ProductMode = "auto" | "silkorm" | "egalis";

export interface CalculationInput {
  culture: string;
  mass: number;
  moisture: number;
  method: "combine" | "sprayer" | "manual";
  speed: number;
  egalisScheme: 2 | 8;
  productMode: ProductMode;
}

export interface CalculationResult {
  product: Product;
  rule: Rule;
  dose: number;
  doseDisplay: string;
  reason: string;
  isForcedProduct: boolean;
  egalisWarning?: string;
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

export interface MoistureRisk {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: "alert-triangle" | "check-circle" | "info";
  text: string;
  level: "warn-low" | "optimal" | "warn-high" | "danger";
}

export function getMoistureRisk(moisture: number): MoistureRisk {
  if (moisture < 25) {
    return {
      color: "#92400E",
      bgColor: "#FFFBEB",
      borderColor: "#FCD34D",
      icon: "alert-triangle",
      text: "Сырьё сухое — риск нагрева и плесени",
      level: "warn-low",
    };
  }
  if (moisture <= 55) {
    return {
      color: "#1E40AF",
      bgColor: "#EFF6FF",
      borderColor: "#93C5FD",
      icon: "check-circle",
      text: "Оптимальный диапазон влажности",
      level: "optimal",
    };
  }
  if (moisture <= 75) {
    return {
      color: "#9A3412",
      bgColor: "#FFF7ED",
      borderColor: "#FDBA74",
      icon: "alert-triangle",
      text: "Высокая влажность — возможны потери сока",
      level: "warn-high",
    };
  }
  return {
    color: "#991B1B",
    bgColor: "#FEF2F2",
    borderColor: "#FCA5A5",
    icon: "alert-triangle",
    text: "Очень высокая влажность — риск маслянокислого брожения",
    level: "danger",
  };
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

const SILKORM_FALLBACK_DOSE = 3;
const EGALIS_DEFAULT_DOSE_G = 50;

export function calculate(input: CalculationInput): CalculationResult | null {
  const naturalRule = findRule(input.culture, input.moisture);

  let rule: Rule;
  let isForcedProduct = false;
  let egalisWarning: string | undefined;

  if (input.productMode === "auto") {
    if (!naturalRule) return null;
    rule = naturalRule;
  } else if (input.productMode === "silkorm") {
    isForcedProduct = naturalRule?.productId !== "silkorm";
    if (!naturalRule) {
      rule = {
        id: "forced-silkorm",
        culture: input.culture,
        moistureMin: 0,
        moistureMax: 100,
        productId: "silkorm",
        doseMin: SILKORM_FALLBACK_DOSE,
        doseMax: SILKORM_FALLBACK_DOSE,
        unit: "л/т",
      };
    } else if (naturalRule.productId === "egalis") {
      rule = {
        ...naturalRule,
        id: "forced-silkorm",
        productId: "silkorm",
        doseMin: SILKORM_FALLBACK_DOSE,
        doseMax: SILKORM_FALLBACK_DOSE,
        unit: "л/т",
      };
    } else {
      rule = naturalRule;
    }
  } else {
    isForcedProduct = naturalRule?.productId !== "egalis";
    if (!naturalRule) {
      rule = {
        id: "forced-egalis",
        culture: input.culture,
        moistureMin: 0,
        moistureMax: 100,
        productId: "egalis",
        doseMin: EGALIS_DEFAULT_DOSE_G,
        doseMax: EGALIS_DEFAULT_DOSE_G,
        unit: "г/т",
      };
    } else if (naturalRule.productId === "silkorm") {
      rule = {
        ...naturalRule,
        id: "forced-egalis",
        productId: "egalis",
        doseMin: EGALIS_DEFAULT_DOSE_G,
        doseMax: EGALIS_DEFAULT_DOSE_G,
        unit: "г/т",
      };
    } else {
      rule = naturalRule;
    }
    if (input.moisture > 70) {
      egalisWarning = "EGALIS Ferment не рекомендован при влажности выше 70% — повышен риск потерь эффективности";
    }
  }

  const product = PRODUCTS.find((p) => p.id === rule.productId);
  if (!product) return null;

  const dose = (rule.doseMin + rule.doseMax) / 2;
  const doseDisplay =
    rule.doseMin === rule.doseMax
      ? `${rule.doseMin}`
      : `${rule.doseMin}–${rule.doseMax}`;

  const reason = isForcedProduct
    ? `выбран вручную (обычно: ${naturalRule ? naturalRule.culture.toLowerCase() : input.culture.toLowerCase()})`
    : buildReason(rule, input.moisture);

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
    isForcedProduct,
    egalisWarning,
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
    result.isForcedProduct ? "(выбран вручную)" : "",
    `Норма: ${result.doseDisplay} ${result.rule.unit}`,
    result.totalLiters !== undefined
      ? `Итого препарата: ${result.totalLiters} л`
      : `Итого препарата: ${(result.totalKg * 1000).toFixed(0)} г`,
    result.totalPacks !== undefined
      ? `Пакетов (50 г): ${result.totalPacks} шт.`
      : "",
    `Настройка дозатора: ${result.pumpLPH} ${result.pumpUnit}`,
    `Цена партии: ${formatCurrency(result.totalCost)} BYN`,
    result.egalisWarning ? `\n⚠️ ${result.egalisWarning}` : "",
  ];
  return lines.filter(Boolean).join("\n");
}
