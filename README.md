# AskTill

A financial analytics dashboard for small businesses. AskTill provides cash flow forecasting, transaction reconciliation, and AI-assisted Q&A over transaction data — all in a clean, responsive single-page application.

## Tech Stack

- **React 18** + **TypeScript** — strict mode
- **Vite 5** — dev server and bundler
- **React Router v6** — client-side routing
- **React Hook Form** — form state management
- **CSS Modules** — scoped styles with global design tokens

## Getting Started

```bash
npm install
npm run dev       # Start dev server at http://localhost:5173
npm run build     # Type-check then bundle for production
npm run preview   # Preview the production build locally
```

Copy `.env.example` to `.env` (defaults point at local services on E: drive).

### Backend services (run before the UI)

| Service | Port | Role |
|---------|------|------|
| **E:\\backend** | 8000 | Reconciliation API (`/api/analyze`, `/api/ask`, …) |
| **Authentication Service** | 8002 | Login + JWT (`POST /api/auth/login`) |
| **Registration-Service** | 8003 | User registration (`POST /api/register`) |

Start the backend from `E:\backend`:

```bash
python run.py
```

Start auth and registration the same way in their folders. The Vite dev server proxies `/api/*` to the correct ports so you avoid CORS during development.

### Auth + upload flow

1. Sign in at `/login` — stores JWT in `localStorage`.
2. Upload bank / POS / ecommerce files at `/onboarding`.
3. Continue runs `POST /api/analyze` and navigates to `/dashboard/overview` with live KPIs.
4. Use **Ask anything** (floating button) for `POST /api/ask` on the same uploads.

> There is no test suite configured.

## Project Structure

```
src/
├── components/
│   ├── analysis/    # StandardQuestions, ProcessorCard, QuestionPicker
│   ├── cashflow/    # ForecastChart, InflowOutflow
│   ├── common/      # KPICard, Logo
│   ├── landing/     # HeroSection, HowItWorks, ProblemSection, SourcesStrip
│   ├── layout/      # DashboardNav, PeriodPicker, SectionHeader, FloatingAskButton
│   ├── recon/       # ReconSummary, FlaggedTable
│   └── upload/      # FileDropZone
├── context/
│   └── PeriodContext.tsx   # Global period selection (Week / Month / Quarter)
├── data/                   # Static mock data (kpis, cashflow, recon, questions, landing)
├── pages/                  # One file per route
├── routes/
│   └── AppRouter.tsx
├── styles/
│   ├── globals.css          # Design tokens (CSS custom properties) + .wrap utility
│   └── reset.css
└── types/
    └── index.ts             # All shared TypeScript interfaces
```

## Routes

| Path | Page | Notes |
|------|------|-------|
| `/` | Landing | Marketing / product overview |
| `/signup` | Signup | Account creation |
| `/login` | Login | Authentication |
| `/onboarding` | File upload | CSV / bank file import |
| `/dashboard/overview` | Analysis | KPIs + AI Q&A |
| `/dashboard/cashflow` | Cash Flow | Forecast chart + inflow/outflow |
| `/dashboard/reconciliation` | Reconciliation | Flagged transactions + summary |

Dashboard routes share the `DashboardNav` layout, which renders the nav bar and a floating **Ask** button on every page.

## Global State

`PeriodProvider` (wrapping the entire app) holds the selected time period — `'Week' | 'Month' | 'Quarter'`. Consumed via the `usePeriod()` hook. The period picker lives in `DashboardNav` and filters all dashboard pages.

## Styling Conventions

Each component and page has a co-located `.module.css` file. Global design tokens are CSS custom properties in `src/styles/globals.css`:

| Token group | Tokens |
|-------------|--------|
| Text | `--ink`, `--body`, `--muted` |
| Surfaces | `--bg`, `--bg-soft`, `--bg-warm` |
| Brand | `--brand*` (primary blue) |
| Semantic | `--pos` (green), `--neg` (red), `--warn` (amber) |
| Layout | `--max: 1180px` max-width; `.wrap` utility class |

## Data

Dashboard pages fall back to static mock data in `src/data/` when no analysis has been run. After upload + analyze, overview KPIs and period labels come from `POST /api/analyze` via `AnalysisContext`.

- `kpis.ts` — KPI cards for the overview page
- `cashflow.ts` — Forecast and inflow/outflow data
- `recon.ts` — Reconciliation transactions
- `questions.ts` — Pre-canned Q&A for the analysis page
- `landing.ts` — Marketing copy and stats
