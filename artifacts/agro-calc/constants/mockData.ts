export interface Product {
  id: string;
  name: string;
  price: number;
  density?: number;
  form: "liquid" | "powder";
  packSizeG?: number;
}

export interface Rule {
  id: string;
  culture: string;
  moistureMin: number;
  moistureMax: number;
  productId: string;
  doseMin: number;
  doseMax: number;
  unit: string;
}

export const PRODUCTS: Product[] = [
  {
    id: "silkorm",
    name: "СилКорм Про",
    price: 5.55,
    density: 1.2,
    form: "liquid",
  },
  {
    id: "egalis",
    name: "EGALIS Ferment",
    price: 2330.84,
    form: "powder",
    packSizeG: 50,
  },
];

export const CULTURES = [
  "Злаковые травы",
  "Бобовые / Однолетние",
  "Кукуруза (силос)",
  "Плющеное зерно",
  "Силос / Сенаж",
  "Влажное зерно",
];

export const RULES: Rule[] = [
  {
    id: "r1",
    culture: "Злаковые травы",
    moistureMin: 0,
    moistureMax: 100,
    productId: "silkorm",
    doseMin: 5,
    doseMax: 5,
    unit: "л/т",
  },
  {
    id: "r2",
    culture: "Бобовые / Однолетние",
    moistureMin: 0,
    moistureMax: 100,
    productId: "silkorm",
    doseMin: 6,
    doseMax: 6,
    unit: "л/т",
  },
  {
    id: "r3",
    culture: "Кукуруза (силос)",
    moistureMin: 0,
    moistureMax: 100,
    productId: "silkorm",
    doseMin: 3,
    doseMax: 3,
    unit: "л/т",
  },
  {
    id: "r4",
    culture: "Плющеное зерно",
    moistureMin: 35,
    moistureMax: 45,
    productId: "silkorm",
    doseMin: 3,
    doseMax: 4,
    unit: "л/т",
  },
  {
    id: "r5",
    culture: "Плющеное зерно",
    moistureMin: 30,
    moistureMax: 35,
    productId: "silkorm",
    doseMin: 4,
    doseMax: 5,
    unit: "л/т",
  },
  {
    id: "r6",
    culture: "Плющеное зерно",
    moistureMin: 25,
    moistureMax: 30,
    productId: "silkorm",
    doseMin: 5,
    doseMax: 6,
    unit: "л/т",
  },
  {
    id: "r7",
    culture: "Силос / Сенаж",
    moistureMin: 55,
    moistureMax: 70,
    productId: "egalis",
    doseMin: 2,
    doseMax: 2,
    unit: "г/т",
  },
  {
    id: "r8",
    culture: "Влажное зерно",
    moistureMin: 25,
    moistureMax: 35,
    productId: "egalis",
    doseMin: 2,
    doseMax: 2,
    unit: "г/т",
  },
];

export const CULTURE_MOISTURE_HINTS: Record<string, string> = {
  "Злаковые травы": "Любая влажность",
  "Бобовые / Однолетние": "Любая влажность",
  "Кукуруза (силос)": "Любая влажность",
  "Плющеное зерно": "Диапазон для расчёта: 25–45%",
  "Силос / Сенаж": "Диапазон для расчёта: 55–70%",
  "Влажное зерно": "Диапазон для расчёта: 25–35%",
};
