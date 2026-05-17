# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server (localhost:5173)
npm run build     # Type-check (tsc) then bundle with Vite
npm run preview   # Preview the production build locally
```

There is no test runner configured.

## Architecture

**AskTill** is a React 18 + TypeScript SPA built with Vite. It is a financial analytics dashboard for small businesses, providing cash flow, reconciliation, and AI-assisted Q&A over transaction data. All data is currently static (hardcoded in `src/data/`).

### Routing (`src/routes/AppRouter.tsx`)

React Router v6 with two layout zones:
- **Public**: `/` (landing), `/signup`, `/login`, `/onboarding` (file upload)
- **Dashboard** (`/dashboard/*`): nested under `DashboardNav` layout component, which renders the nav bar and a `<FloatingAskButton>` on every dashboard page. Sub-routes: `overview` → `AnalysisPage`, `cashflow` → `CashFlowPage`, `reconciliation` → `ReconPage`.

### Global state (`src/context/PeriodContext.tsx`)

A single React context (`PeriodProvider`) wraps the whole app and holds the selected time period (`'Week' | 'Month' | 'Quarter'`). Consumed via the `usePeriod()` hook. The period picker lives in `DashboardNav` and affects all dashboard pages.

### Component organisation

```
src/components/
  common/      # KPICard, Logo — used across pages
  layout/      # DashboardNav, PeriodPicker, SectionHeader, FloatingAskButton
  analysis/    # StandardQuestions, ProcessorCard, QuestionPicker
  cashflow/    # ForecastChart, InflowOutflow
  recon/       # ReconSummary, FlaggedTable
  upload/      # FileDropZone
src/pages/     # One file per route; pages compose components and pull from src/data/
src/data/      # Static mock data files (kpis.ts, cashflow.ts, recon.ts, questions.ts, landing.ts)
src/types/     # Shared TypeScript interfaces (index.ts)
```

### Styling

CSS Modules (`.module.css` co-located with every component and page). Global design tokens are CSS custom properties defined in `src/styles/globals.css` (colours, `--max: 1180px` max-width). `src/styles/reset.css` is a baseline reset. The `.wrap` utility class (defined in `globals.css`) centres content at `--max` with `24px` side padding.

Key token groups: `--ink/--body/--muted` (text), `--bg/--bg-soft/--bg-warm` (surfaces), `--brand*` (primary blue), `--pos/--neg/--warn` (semantic colours).

### TypeScript config

Strict mode is on with `noUnusedLocals`, `noUnusedParameters`, and `noFallthroughCasesInSwitch`. All shared interfaces live in `src/types/index.ts`.
