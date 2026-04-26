export interface Product {
  id: string;
  code: string;
  name: string;
  price: number;
  density?: number;
  form: "liquid" | "powder";
  packSizeG?: number;
}

export interface Rule {
  id: string;
  productCode: string;
  cultureCode: string;
  culture: string;
  moistureMin: number;
  moistureMax: number;
  productId: string;
  doseMin: number;
  doseMax: number;
  unit: string;
  layerMode?: boolean;
  priority?: number;
  recommendation?: string;
}

export interface EgalisPackage {
  code: string;
  massG: number;
  waterFromL: number;
  waterToL: number;
}

export const PRODUCTS: Product[] = [
  {
    id: "silkorm",
    code: "SILKORM_PRO",
    name: "СилКорм Про",
    price: 5.55,
    density: 1.2,
    form: "liquid",
  },
  {
    id: "egalis",
    code: "EGALIS_FERMENT",
    name: "EGALIS Ferment",
    price: 2330.84,
    form: "powder",
    packSizeG: 50,
  },
];

export const EGALIS_PACKAGES: EgalisPackage[] = [
  { code: "EGALIS_50G",  massG: 50,  waterFromL: 50,  waterToL: 200 },
  { code: "EGALIS_200G", massG: 200, waterFromL: 50,  waterToL: 200 },
];

export const CULTURES = [
  "Злаковые травы",
  "Бобовые / Однолетние",
  "Кукуруза (силос)",
  "Плющеное зерно",
  "Злаково-клеверная смесь",
  "Люцерна",
  "Бобовые культуры",
  "Сорго",
  "Цельные растения / wholecrop",
  "Смешанная масса",
];

export const CULTURE_CODES: Record<string, string> = {
  "Злаковые травы":              "CEREAL_GRASS",
  "Бобовые / Однолетние":        "LEGUME_ANNUAL",
  "Кукуруза (силос)":            "CORN_SILAGE",
  "Плющеное зерно":              "ROLLED_GRAIN",
  "Злаково-клеверная смесь":     "GRASS_CLOVER",
  "Люцерна":                     "LUCERNE",
  "Бобовые культуры":            "LEGUMES",
  "Сорго":                       "SORGHUM",
  "Цельные растения / wholecrop":"WHOLECROP",
  "Смешанная масса":             "MIXED_FORAGE",
};

export const RULES: Rule[] = [
  // ── СилКорм Про ────────────────────────────────────────────────
  {
    id: "r1",
    productCode: "SILKORM_PRO",
    cultureCode: "CEREAL_GRASS",
    culture: "Злаковые травы",
    moistureMin: 0, moistureMax: 100,
    productId: "silkorm",
    doseMin: 5, doseMax: 5, unit: "л/т",
    layerMode: true, priority: 10,
    recommendation: "Базовая норма для злаковых трав",
  },
  {
    id: "r2",
    productCode: "SILKORM_PRO",
    cultureCode: "LEGUME_ANNUAL",
    culture: "Бобовые / Однолетние",
    moistureMin: 0, moistureMax: 100,
    productId: "silkorm",
    doseMin: 6, doseMax: 6, unit: "л/т",
    layerMode: true, priority: 10,
    recommendation: "Базовая норма для бобовых и однолетних трав",
  },
  {
    id: "r3",
    productCode: "SILKORM_PRO",
    cultureCode: "CORN_SILAGE",
    culture: "Кукуруза (силос)",
    moistureMin: 0, moistureMax: 100,
    productId: "silkorm",
    doseMin: 3, doseMax: 3, unit: "л/т",
    layerMode: true, priority: 20,
    recommendation: "Базовая норма для кукурузы",
  },
  {
    id: "r4",
    productCode: "SILKORM_PRO",
    cultureCode: "ROLLED_GRAIN_35_45",
    culture: "Плющеное зерно",
    moistureMin: 35, moistureMax: 45,
    productId: "silkorm",
    doseMin: 3, doseMax: 4, unit: "л/т",
    layerMode: false, priority: 15,
    recommendation: "Плющеное зерно 35–45 %",
  },
  {
    id: "r5",
    productCode: "SILKORM_PRO",
    cultureCode: "ROLLED_GRAIN_30_35",
    culture: "Плющеное зерно",
    moistureMin: 30, moistureMax: 35,
    productId: "silkorm",
    doseMin: 4, doseMax: 5, unit: "л/т",
    layerMode: false, priority: 15,
    recommendation: "Плющеное зерно 30–35 %",
  },
  {
    id: "r6",
    productCode: "SILKORM_PRO",
    cultureCode: "ROLLED_GRAIN_25_30",
    culture: "Плющеное зерно",
    moistureMin: 25, moistureMax: 30,
    productId: "silkorm",
    doseMin: 5, doseMax: 6, unit: "л/т",
    layerMode: false, priority: 15,
    recommendation: "Плющеное зерно 25–30 %",
  },

  // ── EGALIS Ferment ─────────────────────────────────────────────
  {
    id: "r7",
    productCode: "EGALIS_FERMENT",
    cultureCode: "CEREAL_GRASS",
    culture: "Злаковые травы",
    moistureMin: 0, moistureMax: 100,
    productId: "egalis",
    doseMin: 1, doseMax: 1, unit: "г/т",
    layerMode: false, priority: 30,
    recommendation: "Злаковые травы; 1 г/т",
  },
  {
    id: "r8",
    productCode: "EGALIS_FERMENT",
    cultureCode: "GRASS_CLOVER",
    culture: "Злаково-клеверная смесь",
    moistureMin: 0, moistureMax: 100,
    productId: "egalis",
    doseMin: 2, doseMax: 2, unit: "г/т",
    layerMode: false, priority: 30,
    recommendation: "Злаково-клеверная смесь; 2 г/т",
  },
  {
    id: "r9",
    productCode: "EGALIS_FERMENT",
    cultureCode: "LUCERNE",
    culture: "Люцерна",
    moistureMin: 0, moistureMax: 100,
    productId: "egalis",
    doseMin: 2, doseMax: 2, unit: "г/т",
    layerMode: false, priority: 30,
    recommendation: "Люцерна; 2 г/т",
  },
  {
    id: "r10",
    productCode: "EGALIS_FERMENT",
    cultureCode: "LEGUMES",
    culture: "Бобовые культуры",
    moistureMin: 0, moistureMax: 100,
    productId: "egalis",
    doseMin: 2, doseMax: 2, unit: "г/т",
    layerMode: false, priority: 30,
    recommendation: "Бобовые культуры; 2 г/т",
  },
  {
    id: "r11",
    productCode: "EGALIS_FERMENT",
    cultureCode: "CORN_SILAGE",
    culture: "Кукуруза (силос)",
    moistureMin: 0, moistureMax: 100,
    productId: "egalis",
    doseMin: 0.5, doseMax: 0.5, unit: "г/т",
    layerMode: false, priority: 15,
    recommendation: "Кукуруза; 0,5 г/т",
  },
  {
    id: "r12",
    productCode: "EGALIS_FERMENT",
    cultureCode: "SORGHUM",
    culture: "Сорго",
    moistureMin: 0, moistureMax: 100,
    productId: "egalis",
    doseMin: 0.5, doseMax: 0.5, unit: "г/т",
    layerMode: false, priority: 25,
    recommendation: "Сорго; 0,5 г/т",
  },
  {
    id: "r13",
    productCode: "EGALIS_FERMENT",
    cultureCode: "WHOLECROP",
    culture: "Цельные растения / wholecrop",
    moistureMin: 0, moistureMax: 100,
    productId: "egalis",
    doseMin: 1, doseMax: 1, unit: "г/т",
    layerMode: false, priority: 25,
    recommendation: "Wholecrop; 1 г/т",
  },
  {
    id: "r14",
    productCode: "EGALIS_FERMENT",
    cultureCode: "MIXED_FORAGE",
    culture: "Смешанная масса",
    moistureMin: 0, moistureMax: 100,
    productId: "egalis",
    doseMin: 1, doseMax: 1, unit: "г/т",
    layerMode: false, priority: 20,
    recommendation: "Смешанная масса; 1 г/т",
  },
];

export const CULTURE_MOISTURE_HINTS: Record<string, string> = {
  "Злаковые травы":              "Любая влажность",
  "Бобовые / Однолетние":        "Любая влажность",
  "Кукуруза (силос)":            "Любая влажность",
  "Плющеное зерно":              "Диапазон для расчёта: 25–45%",
  "Злаково-клеверная смесь":     "Любая влажность",
  "Люцерна":                     "Любая влажность",
  "Бобовые культуры":            "Любая влажность",
  "Сорго":                       "Любая влажность",
  "Цельные растения / wholecrop":"Любая влажность",
  "Смешанная масса":             "Любая влажность",
};
