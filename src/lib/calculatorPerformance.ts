/**
 * Multi-month calculator performance — same formulas/bands as single-month health,
 * laid out like the Asktill Q1 Calculator Performance prototype.
 */

import {
  CALCULATOR_GROUPS,
  type CalculatorId,
  type CalculatorMeta,
  type RiskReading,
} from '@asktill/calculators';

import type { AnalyzeResult } from './analyzeResponse';
import { getAnalyzeAnalysis } from './analyzeResponse';
import {
  buildCalculatorHealthOverview,
  type CalculatorHealthOverview,
  type CalculatorHealthRow,
  type HealthBand,
} from './calculatorHealthReadings';

export type PerformanceTrend = 'up' | 'down' | 'flat' | 'na';

export type PerformanceMonthCol = {
  statementId: string;
  periodKey: string;
  periodLabel: string;
  shortLabel: string;
  overview: CalculatorHealthOverview;
};

export type PerformanceCalcRow = {
  id: CalculatorId;
  meta: CalculatorMeta;
  metricLabel: string;
  cells: CalculatorHealthRow[];
  /** Health fraction per month (null = n/a) for sparkline / trend. */
  healthFracs: (number | null)[];
  trend: PerformanceTrend;
  trendLabel: string;
};

export type CalculatorPerformance = {
  months: PerformanceMonthCol[];
  overallScores: number[];
  overallTrend: PerformanceTrend;
  overallTrendLabel: string;
  improving: number;
  steady: number;
  declining: number;
  summary: string;
  groups: { id: string; title: string; rows: PerformanceCalcRow[] }[];
};

function bandLabelShort(band: HealthBand, score: number): string {
  if (band === 'green' || score >= 80) return 'Healthy';
  if (band === 'amber' || score >= 58) return 'Stable';
  if (band === 'red') return 'At risk';
  return 'n/a';
}

/** Short sticky header label, e.g. "Jan 2026". */
export function shortPeriodLabel(periodLabel: string | null | undefined, fallback: string): string {
  const raw = periodLabel?.trim();
  if (!raw) return fallback;
  const m = raw.match(
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b(?:\s+(\d{4}))?/i,
  );
  if (!m) return raw.length > 12 ? raw.slice(0, 12) : raw;
  const month = m[1].slice(0, 3);
  const year = m[2] ?? '';
  return year ? `${month} ${year}` : month;
}

function healthFracFromRisk(risk: RiskReading | null | undefined): number | null {
  if (!risk || !Number.isFinite(risk.value)) return null;
  const { value, highRisk, lowRisk, direction } = risk;
  if (direction === 'higher_better') {
    return (value - highRisk) / (lowRisk - highRisk || 1);
  }
  return (highRisk - value) / (highRisk - lowRisk || 1);
}

function trendFromFracs(first: number | null, last: number | null): PerformanceTrend {
  if (first == null || last == null) return 'na';
  const d = last - first;
  if (d > 0.08) return 'up';
  if (d < -0.08) return 'down';
  return 'flat';
}

function trendLabel(t: PerformanceTrend): string {
  if (t === 'up') return '↑ Improving';
  if (t === 'down') return '↓ Declining';
  if (t === 'flat') return '→ Steady';
  return '—';
}

function overallTrendFromScores(scores: number[]): PerformanceTrend {
  if (scores.length < 2) return 'na';
  const d = scores[scores.length - 1]! - scores[0]!;
  if (d > 4) return 'up';
  if (d < -4) return 'down';
  return 'flat';
}

function overallTrendWord(t: PerformanceTrend): string {
  if (t === 'up') return 'Improving';
  if (t === 'down') return 'Declining';
  if (t === 'flat') return 'Holding steady';
  return '—';
}

/**
 * Build multi-month performance from loaded analyze results (oldest → newest).
 * Expects 1–3 months; keeps existing single-month health when only one is passed.
 */
export function buildCalculatorPerformance(
  results: AnalyzeResult[],
): CalculatorPerformance | null {
  const months: PerformanceMonthCol[] = [];
  for (const result of results) {
    const overview = buildCalculatorHealthOverview(result);
    const analysis = getAnalyzeAnalysis(result);
    if (!overview || !analysis) continue;
    const statementId = result.statement_id?.trim() || '';
    if (!statementId) continue;
    months.push({
      statementId,
      periodKey: analysis.period_label ?? statementId,
      periodLabel: overview.periodLabel,
      shortLabel: shortPeriodLabel(overview.periodLabel, `M${months.length + 1}`),
      overview,
    });
  }
  if (!months.length) return null;

  const overallScores = months.map((m) => m.overview.score);
  const overallTrend = overallTrendFromScores(overallScores);
  const overallTrendLabel = overallTrendWord(overallTrend);

  let improving = 0;
  let steady = 0;
  let declining = 0;

  const groups = CALCULATOR_GROUPS.map((g) => {
    const rows: PerformanceCalcRow[] = g.calculatorIds.map((id) => {
      const cells = months.map((m) => {
        const row = m.overview.groups
          .flatMap((grp) => grp.rows)
          .find((r) => r.id === id);
        return (
          row ??
          ({
            id,
            meta: { id, name: id, question: '', category: '' } as CalculatorMeta,
            band: 'na' as HealthBand,
            pillLabel: 'n/a',
            metricLabel: '',
            displayMain: '—',
            displayUnit: '',
            risk: null,
          } satisfies CalculatorHealthRow)
        );
      });
      const meta = cells[0]?.meta;
      const metricLabel =
        cells.find((c) => c.metricLabel)?.metricLabel || meta?.name || id;
      const healthFracs = cells.map((c) => healthFracFromRisk(c.risk));
      const trend = trendFromFracs(healthFracs[0] ?? null, healthFracs[healthFracs.length - 1] ?? null);
      if (trend === 'up') improving += 1;
      else if (trend === 'down') declining += 1;
      else if (trend === 'flat') steady += 1;

      return {
        id,
        meta: meta!,
        metricLabel,
        cells,
        healthFracs,
        trend,
        trendLabel: trendLabel(trend),
      };
    });
    return { id: g.id, title: g.title, rows };
  });

  const first = months[0]!;
  const last = months[months.length - 1]!;
  const summary =
    months.length === 1
      ? `${first.periodLabel}: overall health ${first.overview.score} (${bandLabelShort(first.overview.band, first.overview.score)}). Upload more months to see trends.`
      : `Overall health moved from ${first.overview.score} in ${first.shortLabel} to ${last.overview.score} in ${last.shortLabel}. ${improving} improving · ${steady} steady · ${declining} declining.`;

  return {
    months,
    overallScores,
    overallTrend,
    overallTrendLabel,
    improving,
    steady,
    declining,
    summary,
    groups,
  };
}

export function bandCssKey(band: HealthBand): 'g' | 'a' | 'r' | 'na' {
  if (band === 'green') return 'g';
  if (band === 'amber') return 'a';
  if (band === 'red') return 'r';
  return 'na';
}

export function scoreBandColor(score: number): string {
  if (score >= 80) return 'var(--letter-pos)';
  if (score >= 58) return 'var(--letter-warn-text)';
  return 'var(--letter-neg)';
}

export function scoreBandLabel(score: number): string {
  return bandLabelShort(score >= 80 ? 'green' : score >= 58 ? 'amber' : 'red', score);
}
