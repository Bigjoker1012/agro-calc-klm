import { PRODUCTS, RULES, EGALIS_PACKAGES, type Product, type Rule } from "../constants/mockData";

export type ProductMode = "auto" | "silkorm" | "egalis";

export interface CalculationInput {
  culture: string;
  mass: number;
  moisture: number;
  method: "combine" | "sprayer" | "manual";
  speed: number;
  egalisPackSize: 50 | 200;
  egalisWaterPerPack: 50 | 200;
  layerMode: boolean;
  productMode: ProductMode;
}

export interface LayerDoses {
  bottom: number;
  middle: number;
  top: number;
  unit: string;
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
  packLabel?: string;
  solutionLiters?: number;
  solutionLPerT?: number;
  layerDoses?: LayerDoses;
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
      color: "#166534",
      bgColor: "#F0FDF4",
      borderColor: "#86EFAC",
      icon: "check-circle",
      text: "Оптимальный диапазон влажности",
      level: "optimal",
    };
  }
  if (moisture <= 75) {
    return {
      color: "#1E40AF",
      bgColor: "#EFF6FF",
      borderColor: "#93C5FD",
      icon: "info",
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
  const matches = RULES.filter(
    (r) =>
      r.culture === culture &&
      moisture >= r.moistureMin &&
      moisture <= r.moistureMax
  );
  if (matches.length === 0) return null;
  matches.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  return matches[0];
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
const EGALIS_DEFAULT_DOSE_G = 2;

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
        productCode: "SILKORM_PRO",
        cultureCode: input.culture,
        culture: input.culture,
        moistureMin: 0,
        moistureMax: 100,
        productId: "silkorm",
        doseMin: SILKORM_FALLBACK_DOSE,
        doseMax: SILKORM_FALLBACK_DOSE,
        unit: "л/т",
        layerMode: true,
      };
    } else if (naturalRule.productId === "egalis") {
      rule = {
        ...naturalRule,
        id: "forced-silkorm",
        productCode: "SILKORM_PRO",
        productId: "silkorm",
        doseMin: SILKORM_FALLBACK_DOSE,
        doseMax: SILKORM_FALLBACK_DOSE,
        unit: "л/т",
        layerMode: true,
      };
    } else {
      rule = naturalRule;
    }
  } else {
    isForcedProduct = naturalRule?.productId !== "egalis";
    if (!naturalRule) {
      rule = {
        id: "forced-egalis",
        productCode: "EGALIS_FERMENT",
        cultureCode: input.culture,
        culture: input.culture,
        moistureMin: 0,
        moistureMax: 100,
        productId: "egalis",
        doseMin: EGALIS_DEFAULT_DOSE_G,
        doseMax: EGALIS_DEFAULT_DOSE_G,
        unit: "г/т",
        layerMode: false,
      };
    } else if (naturalRule.productId === "silkorm") {
      rule = {
        ...naturalRule,
        id: "forced-egalis",
        productCode: "EGALIS_FERMENT",
        productId: "egalis",
        doseMin: EGALIS_DEFAULT_DOSE_G,
        doseMax: EGALIS_DEFAULT_DOSE_G,
        unit: "г/т",
        layerMode: false,
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
    ? `выбран вручную`
    : buildReason(rule, input.moisture);

  let totalLiters: number | undefined;
  let totalKg: number;
  let totalCost: number;
  let pumpLPH: number;
  let pumpUnit: "л/ч" | "мл/ч";
  let totalPacks: number | undefined;
  let packLabel: string | undefined;
  let solutionLiters: number | undefined;
  let solutionLPerT: number | undefined;
  let layerDoses: LayerDoses | undefined;

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

    if (input.layerMode && rule.layerMode) {
      const toUnit = (v: number): string => {
        const lph = v * input.speed;
        if (lph < 1) return `${round(lph * 1000, 1)} мл/ч`;
        return `${round(lph, 1)} л/ч`;
      };
      layerDoses = {
        bottom: round(dose * 0.75, 2),
        middle: dose,
        top: round(dose * 1.25, 2),
        unit: rule.unit,
      };
    }
  } else {
    const pack = EGALIS_PACKAGES.find((p) => p.massG === input.egalisPackSize)
      ?? EGALIS_PACKAGES[0];
    const doseGPerT = rule.doseMin;
    totalKg = round((doseGPerT / 1000) * input.mass, 4);
    totalCost = round(totalKg * product.price, 2);
    totalPacks = Math.ceil(input.mass / pack.tonsPerPack);
    packLabel = `${pack.massG} г`;
    solutionLiters = round(totalPacks * input.egalisWaterPerPack, 0);
    solutionLPerT = round(solutionLiters / input.mass, 2);
    const rawLPH = solutionLPerT * input.speed;
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
    packLabel,
    solutionLiters,
    solutionLPerT,
    layerDoses,
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
      ? `Пакетов (${result.packLabel ?? "50 г"}): ${result.totalPacks} шт.`
      : "",
    result.solutionLiters !== undefined
      ? `Рабочий раствор: ${result.solutionLiters} л (${result.solutionLPerT} л/т)`
      : "",
    result.layerDoses
      ? `Слои: низ ${result.layerDoses.bottom} ${result.layerDoses.unit} | середина ${result.layerDoses.middle} ${result.layerDoses.unit} | верх ${result.layerDoses.top} ${result.layerDoses.unit}`
      : "",
    `Настройка дозатора: ${result.pumpLPH} ${result.pumpUnit}`,
    `Цена партии: ${formatCurrency(result.totalCost)} BYN`,
    result.egalisWarning ? `\n⚠️ ${result.egalisWarning}` : "",
  ];
  return lines.filter(Boolean).join("\n");
}
