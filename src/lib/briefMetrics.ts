import type { AnalyzeResult } from './analyzeResponse';
import {
  getAnalyzeAnalysis,
  reportChannelDeposits,
  reportMatchedDeposits,
} from './analyzeResponse';
import { shortPeriodLabel } from './calculatorPerformance';

export type BriefMonthMetrics = {
  statementId: string;
  periodLabel: string;
  shortLabel: string;
  moneyIn: number | null;
  moneyOut: number | null;
  cashAvailable: number | null;
  netMarginPct: number | null;
  runwayDays: number | null;
  posIn: number | null;
  ecomIn: number | null;
  feesTotal: number | null;
};

function kpiValue(
  result: AnalyzeResult | null | undefined,
  id: string,
  labelRe?: RegExp,
): number | null {
  const kpis = getAnalyzeAnalysis(result)?.kpis;
  if (!kpis?.length) return null;
  const hit =
    kpis.find((k) => k.id === id) ??
    (labelRe ? kpis.find((k) => labelRe.test(k.id) || labelRe.test(k.label)) : undefined);
  return hit?.value != null && Number.isFinite(hit.value) ? hit.value : null;
}

export function extractBriefMetrics(result: AnalyzeResult | null | undefined): BriefMonthMetrics {
  const analysis = getAnalyzeAnalysis(result);
  const cf = analysis?.cash_flow ?? null;
  const channels = reportChannelDeposits(result);
  const matched = reportMatchedDeposits(result);
  const moneyIn = matched ?? cf?.money_in ?? null;
  const moneyOut = cf?.money_out ?? null;
  const cashAvailable = cf?.cash_on_hand ?? cf?.bank_balance ?? null;
  const fees =
    result?.report?.total_fees != null && result.report.total_fees > 0
      ? result.report.total_fees
      : null;
  const periodLabel = analysis?.period_label?.trim() || cf?.period_label || 'Period';

  return {
    statementId: result?.statement_id?.trim() || '',
    periodLabel,
    shortLabel: shortPeriodLabel(periodLabel, 'Mo'),
    moneyIn,
    moneyOut,
    cashAvailable,
    netMarginPct: kpiValue(result, 'net_margin', /margin/i),
    runwayDays: kpiValue(result, 'days_of_runway', /runway/i),
    posIn: channels.pos,
    ecomIn: channels.ecommerce,
    feesTotal: fees,
  };
}

export function pctDelta(current: number | null, prior: number | null): string | null {
  if (current == null || prior == null || prior === 0) return null;
  const pct = ((current - prior) / Math.abs(prior)) * 100;
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

export function ptsDelta(current: number | null, prior: number | null): string | null {
  if (current == null || prior == null) return null;
  const d = current - prior;
  const sign = d > 0 ? '+' : '';
  return `${sign}${d.toFixed(1)} pts`;
}

export function absDelta(current: number | null, prior: number | null, suffix = ''): string | null {
  if (current == null || prior == null) return null;
  const d = Math.round(current - prior);
  const sign = d > 0 ? '+' : '';
  return `${sign}${d}${suffix}`;
}

/** Chronological series from rolling window (oldest → newest). */
export function metricsSeries(results: AnalyzeResult[]): BriefMonthMetrics[] {
  return results
    .filter((r) => getAnalyzeAnalysis(r))
    .map(extractBriefMetrics);
}

export function feesPct(moneyIn: number | null, feesTotal: number | null): number | null {
  if (moneyIn == null || moneyIn <= 0 || feesTotal == null) return null;
  return (feesTotal / moneyIn) * 100;
}
