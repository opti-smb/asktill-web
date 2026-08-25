import { useCallback, useMemo, useState } from 'react';

import ActionPlanModal from '../components/letter/ActionPlanModal';
import BriefActionCenter from '../components/brief/BriefActionCenter';
import BriefBreakdown from '../components/brief/BriefBreakdown';
import BriefCashMovement from '../components/brief/BriefCashMovement';
import BriefHeader from '../components/brief/BriefHeader';
import BriefHealth, { type HealthCard } from '../components/brief/BriefHealth';
import BriefInsights, { type InsightCard } from '../components/brief/BriefInsights';
import BriefKpis from '../components/brief/BriefKpis';
import BriefPriorities, { type PriorityItem } from '../components/brief/BriefPriorities';
import BriefTrends from '../components/brief/BriefTrends';
import DashboardEmptyState from '../components/dashboard/DashboardEmptyState';
import { useAnalysis } from '../context/AnalysisContext';
import { useAuth } from '../context/AuthContext';
import { useRiskThresholds } from '../context/RiskThresholdContext';
import { useAtLetterTemplate } from '../hooks/useAtLetterTemplate';
import { usePlaidBankMetrics } from '../hooks/usePlaidBankMetrics';
import { formatBankLinkedFootnote } from '../lib/plaidBankMetrics';
import { useHasLiveDashboardAnalysis, useReportSync } from '../hooks/useReportSync';
import { ROLLING_VIEW, useRollingReports } from '../hooks/useRollingReports';
import { fmtMoney, getAnalyzeAnalysis } from '../lib/analyzeResponse';
import {
  absDelta,
  extractBriefMetrics,
  feesPct as calcFeesPct,
  metricsSeries,
  pctDelta,
  ptsDelta,
} from '../lib/briefMetrics';
import { buildCalculatorHealthOverview } from '../lib/calculatorHealthReadings';
import { downloadMonthlyReportPdf } from '../lib/api';
import { downloadPdfWithSaveDialog, filenameFromDisposition } from '../lib/downloadReport';
import styles from './AtLetterPage.module.css';

function monthOnlyLabelFromPeriod(periodLabel: string | null | undefined): string {
  const label = periodLabel?.trim();
  if (!label) return 'This month only';
  const short = label.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i,
  );
  if (short) {
    const token = short[1];
    const abbr =
      token.length <= 3
        ? token.charAt(0).toUpperCase() + token.slice(1).toLowerCase()
        : token.slice(0, 3);
    return `${abbr} only`;
  }
  return `${label.split(/\s+/)[0]} only`;
}

function parseUsd(s?: string | null): number | null {
  if (s == null || s === '—') return null;
  const n = Number(String(s).replace(/[$,()\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function signedMoneyDelta(current: number | null, previous: number | null): string | null {
  if (current == null || previous == null || !Number.isFinite(current) || !Number.isFinite(previous)) {
    return null;
  }
  const d = current - previous;
  if (d === 0) return 'No change vs last pull';
  const sign = d > 0 ? '+' : '';
  return `${sign}${fmtMoney(d)} vs last pull`;
}

function dashMoney(n: number | null | undefined): string {
  return n != null && Number.isFinite(n) ? fmtMoney(n) : '—';
}

function channelCount(pos: number | null, ecom: number | null): number {
  return (pos != null && pos > 0 ? 1 : 0) + (ecom != null && ecom > 0 ? 1 : 0);
}

const SPEND_COLORS = ['#dc2626', '#f97316', '#fbbf24', '#fdba74', '#fb7185', '#f43f5e'];
const INCOME_COLORS = ['#0f8a57', '#86efac', '#34d399', '#059669'];

const briefWidthStyle = {
  width: '100%',
  maxWidth: 'none',
} as const;

export default function AtLetterPage() {
  const { result } = useAnalysis();
  const { user } = useAuth();
  const { evaluate: evaluateRisk, prefs } = useRiskThresholds();
  const bankMetrics = usePlaidBankMetrics(user?.userId);
  const { historyReady, savedReports } = useReportSync();
  const { statementId, periodLabel, footerMeta } = useAtLetterTemplate();
  const hasLiveAnalysis = useHasLiveDashboardAnalysis(result);
  const [actionPlanOpen, setActionPlanOpen] = useState(false);

  const letterStatementId = statementId ?? undefined;
  const canSelectMonth = Boolean(letterStatementId || result);
  const analysis = getAnalyzeAnalysis(result);
  const cashFlow = analysis?.cash_flow ?? null;

  const {
    monthOnly,
    showViewFilters,
    rollingResults,
    trendResults,
    rollingLoading,
    trendLoading,
    rollingError,
    loadStatus,
    selectView,
    selectViewOnHover,
    clearHoverTimer,
    monthsOnFile,
  } = useRollingReports({
    result,
    savedReports,
    historyReady,
    canSelectMonth,
  });

  const series = useMemo(() => {
    if (!monthOnly && rollingResults.length) return metricsSeries(rollingResults);
    return result ? [extractBriefMetrics(result)] : [];
  }, [monthOnly, rollingResults, result]);

  const trendSeries = useMemo(() => {
    if (monthOnly) {
      return result ? [extractBriefMetrics(result)] : [];
    }
    if (trendResults.length) return metricsSeries(trendResults);
    return result ? [extractBriefMetrics(result)] : [];
  }, [monthOnly, trendResults, result]);

  const latest = series[series.length - 1] ?? null;
  // Single-month view: no prior / MoM comparison — that month only.
  const prior = monthOnly
    ? null
    : series.length > 1
      ? series[series.length - 2]!
      : null;

  /** Saved upload (POS / ecom / fees / margin / health) — never replaced by Plaid. */
  const uploadMoneyIn = latest?.moneyIn ?? null;
  const uploadMoneyOut = latest?.moneyOut ?? null;
  const uploadCashAvailable = latest?.cashAvailable ?? null;

  /** Top KPI row only — live bank stmt when linked; everything else stays on upload. */
  const bankLinked = bankMetrics != null;
  const moneyIn = bankLinked ? bankMetrics.moneyIn : uploadMoneyIn;
  const moneyOut = bankLinked ? bankMetrics.moneyOut : uploadMoneyOut;
  const cashAvailable = bankLinked ? bankMetrics.cashAvailable : uploadCashAvailable;
  const netMarginPct = latest?.netMarginPct ?? null;
  const runwayDays = latest?.runwayDays ?? null;
  const posIn = latest?.posIn ?? null;
  const ecomIn = latest?.ecomIn ?? null;
  const feesTotal = latest?.feesTotal ?? null;
  const feesPct = calcFeesPct(uploadMoneyIn, feesTotal);
  const startBalance =
    cashAvailable != null && moneyIn != null && moneyOut != null
      ? Math.max(0, cashAvailable - moneyIn + moneyOut)
      : null;

  const bankLinkedFootnote = bankLinked && bankMetrics
    ? formatBankLinkedFootnote(bankMetrics)
    : null;
  const lastPull = bankLinked ? bankMetrics?.comparedTo ?? null : null;

  const moneyInDelta = lastPull
    ? signedMoneyDelta(moneyIn, lastPull.moneyIn)
    : (monthOnly ? null : pctDelta(moneyIn, prior?.moneyIn ?? null));
  const moneyOutDelta = lastPull
    ? signedMoneyDelta(moneyOut, lastPull.moneyOut)
    : (monthOnly ? null : pctDelta(moneyOut, prior?.moneyOut ?? null));
  const marginDelta = ptsDelta(netMarginPct, prior?.netMarginPct ?? null);
  const runwayDelta = absDelta(runwayDays, prior?.runwayDays ?? null, ' days');
  const cashDelta = lastPull
    ? signedMoneyDelta(cashAvailable, lastPull.cashAvailable)
    : (monthOnly ? null : pctDelta(cashAvailable, prior?.cashAvailable ?? null));

  /** Same scoreboard as Business Health (calculators) — not runway/margin heuristic. */
  const healthOverview = useMemo(
    () => buildCalculatorHealthOverview(result, evaluateRisk),
    [result, evaluateRisk, prefs],
  );
  const healthScore = healthOverview?.score ?? null;
  const healthBandLabel = healthOverview?.bandLabel ?? null;

  const periodMeta =
    latest?.periodLabel || periodLabel?.trim() || analysis?.period_label?.trim() || 'This period';
  const priorLabel = prior?.shortLabel ?? null;

  const viewMeta = useMemo(() => {
    if (!monthOnly) {
      if (monthsOnFile >= 3) {
        return 'Quarter view — comparing your latest 3 months on file.';
      }
      if (monthsOnFile === 2) {
        return 'Comparing your latest 2 months on file.';
      }
      if (monthsOnFile === 1) {
        return 'Only 1 month on file — upload more months for a fuller comparison.';
      }
      return 'Upload more months to unlock a multi-month comparison.';
    }
    return `${periodMeta} only — single-month brief, no rolling comparison.`;
  }, [monthOnly, monthsOnFile, periodMeta]);

  const trendMonths = useMemo(() => trendSeries.map((m) => m.shortLabel), [trendSeries]);
  const trendMonthTitles = useMemo(
    () => trendSeries.map((m) => m.periodLabel || m.shortLabel),
    [trendSeries],
  );

  const trendChartSeries = useMemo(() => {
    if (!trendSeries.length) return [];
    const cashOk = trendSeries.some((m) => m.cashAvailable != null);
    const revOk = trendSeries.some((m) => m.moneyIn != null);
    const expOk = trendSeries.some((m) => m.moneyOut != null);
    const out = [];
    if (cashOk) {
      out.push({
        id: 'cash',
        label: 'Cash balance',
        caption: 'Ending balance each month',
        values: trendSeries.map((m) => m.cashAvailable ?? 0),
        color: '#0f8a57',
        fill: '#34d399',
      });
    }
    if (revOk) {
      out.push({
        id: 'rev',
        label: 'Revenue',
        caption: 'Monthly inflow',
        values: trendSeries.map((m) => m.moneyIn ?? 0),
        color: '#0f8a57',
        fill: '#6ee7b7',
      });
    }
    if (expOk) {
      out.push({
        id: 'exp',
        label: 'Expenses',
        caption: 'Monthly outflow',
        values: trendSeries.map((m) => m.moneyOut ?? 0),
        color: '#e11d48',
        fill: '#fb7185',
      });
    }
    return out;
  }, [trendSeries]);

  const kpiItems = useMemo(() => {
    const channels = channelCount(posIn, ecomIn);
    const vs = monthOnly
      ? 'This period'
      : priorLabel
        ? `vs ${priorLabel}`
        : 'Latest month';
    const moneyInFootnote = bankLinkedFootnote
      ?? (channels > 0
        ? `${channels} channel${channels > 1 ? 's' : ''} · ${vs}`
        : vs);
    return [
      {
        id: 'in',
        label: monthOnly ? 'Money In' : 'Money In (latest)',
        value: dashMoney(moneyIn),
        delta: lastPull || !monthOnly ? moneyInDelta : null,
        deltaTone: (moneyInDelta?.startsWith('-') ? 'down' : 'up') as 'up' | 'down',
        footnote: moneyInFootnote,
        icon: 'ti-arrow-down-left',
        iconTone: 'green' as const,
      },
      {
        id: 'out',
        label: monthOnly ? 'Money Out' : 'Money Out (latest)',
        value: dashMoney(moneyOut),
        delta: lastPull || !monthOnly ? moneyOutDelta : null,
        deltaTone: (moneyOutDelta?.startsWith('+') ? 'up' : 'down') as 'up' | 'down',
        footnote: bankLinkedFootnote
          ?? (monthOnly
            ? vs
            : (cashFlow?.money_out_subtitle ?? vs)),
        icon: 'ti-arrow-up-right',
        iconTone: 'red' as const,
      },
      {
        id: 'cash',
        label: 'Cash Available',
        value: dashMoney(cashAvailable),
        delta: lastPull
          ? cashDelta
          : monthOnly
            ? runwayDays != null
              ? `${Math.round(runwayDays)} days runway`
              : null
            : (cashDelta ??
              (runwayDays != null ? `${Math.round(runwayDays)} days runway` : null)),
        deltaTone: (lastPull
          ? cashDelta?.startsWith('-')
            ? 'down'
            : cashDelta
              ? 'up'
              : 'muted'
          : monthOnly
            ? 'muted'
            : cashDelta?.startsWith('-')
              ? 'down'
              : cashDelta
                ? 'up'
                : 'muted') as 'up' | 'down' | 'muted',
        footnote: bankLinkedFootnote
          ?? (!monthOnly && runwayDelta && priorLabel ? `Runway ${runwayDelta} · ${vs}` : vs),
        icon: 'ti-wallet',
        iconTone: 'blue' as const,
      },
      {
        id: 'margin',
        label: 'Net Margin',
        value: netMarginPct != null ? `${netMarginPct.toFixed(1)}%` : '—',
        delta: monthOnly ? null : marginDelta,
        deltaTone: (marginDelta?.startsWith('-') ? 'down' : 'up') as 'up' | 'down',
        footnote: vs,
        icon: 'ti-chart-pie',
        iconTone: 'teal' as const,
      },
    ];
  }, [
    monthOnly,
    moneyIn,
    moneyOut,
    cashAvailable,
    netMarginPct,
    runwayDays,
    moneyInDelta,
    moneyOutDelta,
    cashDelta,
    marginDelta,
    runwayDelta,
    posIn,
    ecomIn,
    priorLabel,
    cashFlow?.money_out_subtitle,
    bankLinked,
    bankLinkedFootnote,
    lastPull,
  ]);

  const payrollFromOutflows = useMemo(() => {
    const rows = cashFlow?.outflows ?? [];
    const hit = rows.find((r) => /payroll|wages|salary/i.test(r.label));
    return hit ? parseUsd(hit.value_usd) : null;
  }, [cashFlow?.outflows]);

  const payrollPct =
    payrollFromOutflows != null && uploadMoneyIn != null && uploadMoneyIn > 0
      ? (payrollFromOutflows / uploadMoneyIn) * 100
      : null;

  const priorities = useMemo(() => {
    const items: PriorityItem[] = [];
    if (runwayDays != null) {
      items.push({
        id: 'runway',
        title: 'Cash runway',
        value: `${Math.round(runwayDays)} days remaining`,
        caption: !monthOnly && runwayDelta && priorLabel ? `${runwayDelta} vs ${priorLabel}` : null,
        badge: runwayDays < 30 ? 'CRITICAL' : runwayDays < 45 ? 'HIGH' : 'OK',
        tone: runwayDays < 30 ? 'critical' : runwayDays < 45 ? 'high' : 'watch',
        icon: 'ti-hourglass',
      });
    }
    if (payrollPct != null) {
      items.push({
        id: 'payroll',
        title: 'Payroll vs revenue',
        value: `${payrollPct.toFixed(1)}%`,
        caption: 'From statement outflows',
        badge: payrollPct > 28 ? 'HIGH' : 'OK',
        tone: payrollPct > 28 ? 'high' : 'watch',
        icon: 'ti-users',
      });
    }
    if (feesPct != null) {
      items.push({
        id: 'fees',
        title: 'Processing fees',
        value: `${feesPct.toFixed(2)}%`,
        caption: feesTotal != null ? `${fmtMoney(feesTotal)} this period` : null,
        badge: feesPct > 3 ? 'WATCH' : 'OK',
        tone: 'watch',
        icon: 'ti-receipt-2',
      });
    }
    return items;
  }, [monthOnly, runwayDays, runwayDelta, priorLabel, payrollPct, feesPct, feesTotal]);

  const incomeSlices = useMemo(() => {
    if (bankLinked && bankMetrics) {
      if (bankMetrics.incomeSlices?.length) {
        return bankMetrics.incomeSlices.map((slice, index) => ({
          ...slice,
          color: INCOME_COLORS[index % INCOME_COLORS.length]!,
        }));
      }
      if (bankMetrics.moneyIn > 0) {
        return [{
          id: 'bank-in',
          label: 'Bank deposits',
          value: bankMetrics.moneyIn,
          color: INCOME_COLORS[0]!,
        }];
      }
    }
    const slices: { id: string; label: string; value: number; color: string }[] = [];
    if (posIn != null && posIn > 0) {
      slices.push({ id: 'pos', label: 'POS (In-store)', value: posIn, color: INCOME_COLORS[0]! });
    }
    if (ecomIn != null && ecomIn > 0) {
      slices.push({
        id: 'ecom',
        label: 'E-commerce (Online)',
        value: ecomIn,
        color: INCOME_COLORS[1]!,
      });
    }
    if (!slices.length && uploadMoneyIn != null && uploadMoneyIn > 0) {
      slices.push({ id: 'in', label: 'Money in', value: uploadMoneyIn, color: INCOME_COLORS[0]! });
    }
    return slices;
  }, [bankLinked, bankMetrics, posIn, ecomIn, uploadMoneyIn]);

  const spendSlices = useMemo(() => {
    if (bankLinked && bankMetrics) {
      if (bankMetrics.spendSlices?.length) {
        return bankMetrics.spendSlices.map((slice, index) => ({
          ...slice,
          color: SPEND_COLORS[index % SPEND_COLORS.length]!,
        }));
      }
      if (bankMetrics.moneyOut > 0) {
        return [{
          id: 'bank-out',
          label: 'Bank outflows',
          value: bankMetrics.moneyOut,
          color: SPEND_COLORS[0]!,
        }];
      }
    }
    const rows = cashFlow?.outflows ?? [];
    const parsed = rows
      .map((row, i) => ({
        id: `out-${i}`,
        label: row.label,
        value: parseUsd(row.value_usd) ?? 0,
        color: SPEND_COLORS[i % SPEND_COLORS.length]!,
      }))
      .filter((r) => r.value > 0);
    if (parsed.length) return parsed;
    if (uploadMoneyOut != null && uploadMoneyOut > 0) {
      return [{ id: 'out', label: 'Money out', value: uploadMoneyOut, color: SPEND_COLORS[0]! }];
    }
    return [];
  }, [bankLinked, bankMetrics, cashFlow?.outflows, uploadMoneyOut]);

  const insights = useMemo(() => {
    const tones = ['green', 'blue', 'orange', 'purple'] as const;
    const icons = ['ti-bulb', 'ti-cash', 'ti-alert-triangle', 'ti-chart-line'];
    const live = analysis?.standard_insights ?? [];
    return live.slice(0, 3).map((insight, i): InsightCard => {
      const highlight = insight.highlight_value?.trim() || '';
      const headline = insight.headline?.trim() || '';
      const value =
        highlight && highlight.length <= 28
          ? highlight
          : headline || highlight || '—';
      const body =
        insight.answer?.trim() ||
        (highlight && highlight !== value ? highlight : '') ||
        insight.question ||
        '';
      return {
        id: insight.id || `insight-${i}`,
        title: insight.tag || headline || 'Insight',
        value,
        body,
        cta: 'View details',
        tone: tones[i % tones.length]!,
        icon: icons[i % icons.length]!,
        to:
          /fee|commission|reconcil/i.test(`${insight.id} ${insight.tag}`)
            ? /reconcil/i.test(`${insight.id} ${insight.tag}`)
              ? '/dashboard/at-ledger/reconciliation'
              : '/dashboard/rewards'
            : /cash|runway|flow/i.test(`${insight.id} ${insight.tag}`)
              ? '/dashboard/at-ledger/cashflow'
              : '/dashboard/at-ledger/overview',
      };
    });
  }, [analysis?.standard_insights]);

  const healthCards = useMemo(() => {
    if (!healthOverview) return [] as HealthCard[];
    const toneOf = (band: string): HealthCard['tone'] =>
      band === 'green' ? 'good' : band === 'amber' ? 'watch' : 'bad';
    const scoreOf = (band: string): number =>
      band === 'green' ? 100 : band === 'amber' ? 60 : 25;
    return healthOverview.groups
      .flatMap((g) => g.rows)
      .filter((r) => r.band !== 'na')
      .slice(0, 5)
      .map((r) => ({
        id: r.id,
        label: r.meta.name,
        status: r.pillLabel,
        score: scoreOf(r.band),
        tone: toneOf(r.band),
      }));
  }, [healthOverview]);

  const onExport = useCallback(async () => {
    if (!letterStatementId) return;
    const fallbackName = `Business_Brief_${periodMeta.replace(/\s+/g, '_')}.pdf`;
    try {
      await downloadPdfWithSaveDialog({
        suggestedFilename: fallbackName,
        fetchBlob: async () => {
          const { data, headers } = await downloadMonthlyReportPdf(letterStatementId);
          const disposition = headers?.['content-disposition'] as string | undefined;
          const filename = filenameFromDisposition(disposition, fallbackName);
          return new File([data], filename, { type: 'application/pdf' });
        },
      });
    } catch {
      /* keep brief usable if export fails */
    }
  }, [letterStatementId, periodMeta]);

  if (!hasLiveAnalysis) {
    return (
      <div className={styles.briefPage} style={briefWidthStyle}>
        <div className={styles.main}>
          <div className={styles.fullWrap}>
            <DashboardEmptyState historyReady={historyReady} loadingHintClassName={styles.emptyHint} />
          </div>
        </div>
      </div>
    );
  }

  const spark = healthScore != null ? [healthScore] : [];

  return (
    <>
      <div className={styles.briefPage} style={briefWidthStyle}>
        <div className={styles.main}>
          <div className={styles.fullWrap}>
            <div className={styles.titleChrome}>
              <BriefHeader
                periodLabel={periodMeta}
                healthScore={healthScore}
                healthDelta={null}
                healthDeltaDown={false}
                healthPrevLabel={priorLabel}
                healthCaption={healthBandLabel}
                monthOnly={monthOnly}
                monthFilterLabel={monthOnlyLabelFromPeriod(periodLabel)}
                showViewFilters={showViewFilters}
                viewMeta={viewMeta}
                footerMeta={footerMeta}
                loadStatus={loadStatus}
                rollingError={rollingError}
                rollingLoading={rollingLoading && !monthOnly}
                onSelectRolling={() => selectView(ROLLING_VIEW)}
                onSelectMonth={() => selectView('month')}
                onHoverRolling={() => selectViewOnHover(ROLLING_VIEW)}
                onHoverMonth={() => selectViewOnHover('month')}
                onFilterMouseLeave={clearHoverTimer}
                onExport={letterStatementId ? onExport : undefined}
              />
            </div>

            <div className={styles.scrollViewport}>
              <BriefKpis items={kpiItems} />
              <BriefPriorities items={priorities} onViewActionPlan={() => setActionPlanOpen(true)} />
              <BriefCashMovement
                model={{
                  start: bankLinked && bankMetrics?.openingBalance != null
                    ? bankMetrics.openingBalance
                    : startBalance,
                  posIn: bankLinked ? null : posIn,
                  ecomIn: bankLinked ? null : ecomIn,
                  billsOut: moneyOut,
                  end: cashAvailable,
                }}
              />
              <BriefBreakdown
                income={incomeSlices}
                incomeTotal={moneyIn}
                spend={spendSlices}
                spendTotal={moneyOut}
              />
              <BriefHealth cards={healthCards} overall={healthScore} spark={spark} />
              <BriefInsights items={insights} />
              {trendChartSeries.length && trendMonths.length ? (
                <BriefTrends
                  months={trendMonths}
                  monthTitles={trendMonthTitles}
                  series={trendChartSeries}
                  loading={!monthOnly && trendLoading}
                  rangeLabel={monthOnly ? periodMeta : 'last 6 months'}
                />
              ) : null}
              <BriefActionCenter />
            </div>
          </div>
        </div>
      </div>
      <ActionPlanModal open={actionPlanOpen} onClose={() => setActionPlanOpen(false)} />
    </>
  );
}
