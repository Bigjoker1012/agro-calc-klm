# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## AgroCalc КЛМ

Mobile agricultural calculator app for KLM company. Accessible at `calc.klm-fid.by`.

### Features
- Product mode selector: Авто / СилКорм® Про / EGALIS Ferment
- Cultures: Злаковые травы, Бобовые, Кукуруза, Плющеное зерно, Злаково-клеверная смесь, Люцерна, Бобовые культуры
- Moisture slider (0–100%) with risk indicator (yellow/green/blue/red)
- Method: Через комбайн / Опрыскиватель / Ручное
- EGALIS conditional fields: pack size (50г / 200г), water per pack (50л / 200л)
- СилКорм layer mode (75% / 100% / 125%) for trench application
- Google Sheets sync: справочники read via API, history written after each saved calculation
- Offline-first: cached справочники + queue for unsynced records

### Google Sheets
- Sheet ID: `1PfQfQXCxs31qS3B1sGRwS0VwkE3PGLEbVOvXVbdGFiI`
- Sheets: Продукты, Культуры_и_сырье, Правила_дозирования, Пакеты_EGALIS, Цены, История_шаблон
- Integration: Replit Google Sheets connector (OAuth)

### API Endpoints (api-server port 8080)
- `GET /api/sheets/data` — fetch all справочники from Google Sheets
- `POST /api/sheets/history` — append calculation record to История_шаблон

### Key Files
- `artifacts/agro-calc/app/(tabs)/index.tsx` — main calculator screen
- `artifacts/agro-calc/utils/calculator.ts` — calculation engine
- `artifacts/agro-calc/constants/mockData.ts` — local справочники (fallback)
- `artifacts/agro-calc/services/sheetsApi.ts` — Google Sheets sync service
- `artifacts/api-server/src/lib/sheets.ts` — Google Sheets API via @replit/connectors-sdk
- `artifacts/api-server/src/routes/sheets.ts` — API routes for sheets

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Mobile**: Expo / React Native
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
