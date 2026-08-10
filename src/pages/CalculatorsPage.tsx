import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import DashboardEmptyState from '../components/dashboard/DashboardEmptyState';
import CalculatorPerformancePanel from '../components/calculators/CalculatorPerformance';
import CustomRiskControl from '../components/calculators/CustomRiskControl';
import Field from '../components/calculators/Field';
import ResultBlock from '../components/calculators/ResultBlock';
import RiskGauge from '../components/calculators/RiskGauge';
import Spinner from '../components/common/Spinner';
import SectionHeader from '../components/layout/SectionHeader';
import { useAnalysis } from '../context/AnalysisContext';
import { useRiskThresholds } from '../context/RiskThresholdContext';
import {
  hasRecentAnalyzeSession,
  useHasLiveDashboardAnalysis,
  useReportSync,
} from '../hooks/useReportSync';
import { mergeDefaults, type NumMap } from '../hooks/useCalculatorForm';
import { getActiveStatementViewId } from '../lib/activeStatementView';
import { fetchSavedReport } from '../lib/api';
import { getAnalyzeAnalysis, type AnalyzeResult } from '../lib/analyzeResponse';
import {
  comparePeriodKeys,
  periodKeyFromLabel,
  resolveAtLetterStatementId,
} from '../lib/atLetterStatement';
import { buildCalculatorHealthOverview } from '../lib/calculatorHealthReadings';
import { buildCalculatorPerformance } from '../lib/calculatorPerformance';
import {
  getCachedCalculatorReport,
  getCachedRollingWindow,
  putCachedCalculatorReport,
  putCachedRollingWindow,
  rollingWindowKey,
} from '../lib/calculatorRollingCache';
import { statementDefaultsFor, statementProcessorRates } from '../lib/statementCalculatorInputs';
import {
  calcBreakEven,
  calcBuyVsLease,
  calcCashFlowForecast,
  calcCashRunway,
  calcEmployeeTrueCost,
  calcGrossMargin,
  calcHiringImpact,
  calcInventoryTurnover,
  calcLatePaymentCost,
  calcLoanPayment,
  calcMcaApr,
  calcNetMargin,
  calcPayrollPct,
  calcProcessorFees,
  calcRoi,
  calcSbaEstimate,
  calcTargetPrice,
  calcWeeklyTracker,
  fmtDays,
  fmtMoney,
  fmtMoney2,
  fmtPct,
  getCalculator,
  optN,
  type CalculatorId,
} from '@asktill/calculators';

import styles from './CalculatorsPage.module.css';

const ROLLING_VIEW = 'rolling';
const HOVER_VIEW_MS = 120;

/** Decorative row icons only — no effect on scoring or thresholds. */
function healthRowIcon(id: string): string {
  const map: Record<string, string> = {
    'cash-runway': 'ti-calendar-stats',
    'cash-flow-forecast': 'ti-chart-arrows-vertical',
    'break-even': 'ti-target',
    'weekly-cash-flow': 'ti-calendar-week',
    'gross-margin': 'ti-percentage',
    'pricing-margin': 'ti-tag',
    'net-margin': 'ti-chart-pie',
    roi: 'ti-trending-up',
    'processor-compare': 'ti-credit-card',
    'mca-apr': 'ti-receipt-2',
    'late-payment-cost': 'ti-clock-exclamation',
    'hiring-affordability': 'ti-user-plus',
    'employee-true-cost': 'ti-user-dollar',
    'payroll-pct-revenue': 'ti-users',
    'loan-affordability': 'ti-building-bank',
    'sba-eligibility': 'ti-certificate',
    'buy-vs-lease': 'ti-truck',
    'inventory-turnover': 'ti-packages',
  };
  return map[id] ?? 'ti-calculator';
}

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

export default function CalculatorsPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { result, loadSavedReport } = useAnalysis();
  const { historyReady, savedCount, primaryReport, savedReports } = useReportSync();
  const { evaluate: evaluateRisk, prefs } = useRiskThresholds();
  const hasLiveAnalysis = useHasLiveDashboardAnalysis(result);
  const analysis = getAnalyzeAnalysis(result);
  /** Only set after the user clicks a calculator card — never from a leftover URL alone. */
  const [selectedId, setSelectedId] = useState<CalculatorId | null>(null);
  const active = selectedId ? getCalculator(selectedId) : undefined;
  const [hydrating, setHydrating] = useState(false);
  const [hydrateError, setHydrateError] = useState<string | null>(null);
  const [values, setValues] = useState<NumMap>({});
  const hydrateAttemptRef = useRef<string | null>(null);
  /** null = default to latest month only (same as AT Letter). */
  const [viewMode, setViewMode] = useState<'rolling' | 'month' | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [rollingResults, setRollingResults] = useState<AnalyzeResult[]>([]);
  const [rollingLoading, setRollingLoading] = useState(false);
  const [rollingError, setRollingError] = useState<string | null>(null);
  /** Live status while opening months — month name + progress, not a vague "Loading…". */
  const [loadStatus, setLoadStatus] = useState<string | null>(null);
  /** Months-on-file + how-to-read panels — collapsed by default to save space. */
  const [showGuidePanels, setShowGuidePanels] = useState(false);
  /** In-component mirror; durable store is calculatorRollingCache (survives tab changes). */
  const rollingCacheRef = useRef<Map<string, AnalyzeResult>>(new Map());

  const sortedReports = useMemo(() => {
    return [...savedReports].sort((a, b) => {
      const byPeriod = comparePeriodKeys(a.period_key, b.period_key);
      if (byPeriod !== 0) return byPeriod;
      return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
    });
  }, [savedReports]);

  const activeStatementId =
    getActiveStatementViewId() ?? result?.statement_id?.trim() ?? null;

  /** Same default as AT Letter: month only when a statement is loaded. */
  const activeView = viewMode ?? (activeStatementId || analysis ? 'month' : ROLLING_VIEW);
  const monthOnly = activeView !== ROLLING_VIEW;
  const showViewFilters = Boolean(activeStatementId || analysis);

  const clearHoverTimer = useCallback(() => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);

  const selectViewOnHover = useCallback(
    (mode: 'rolling' | 'month') => {
      clearHoverTimer();
      if (mode === 'month' && !(activeStatementId || analysis)) return;
      const already =
        mode === ROLLING_VIEW ? activeView === ROLLING_VIEW : activeView !== ROLLING_VIEW;
      if (already) return;
      // Instant when Last 3 months is already cached — no loading flash on hover.
      if (mode === ROLLING_VIEW) {
        const key = rollingWindowKey(sortedReports.slice(-3).map((r) => r.statement_id));
        const hit = key ? getCachedRollingWindow(key) : undefined;
        if (hit) {
          setRollingResults(hit);
          setRollingLoading(false);
          setLoadStatus(null);
          setViewMode('rolling');
          return;
        }
      }
      hoverTimer.current = setTimeout(() => {
        setViewMode(mode);
      }, HOVER_VIEW_MS);
    },
    [activeView, clearHoverTimer, activeStatementId, analysis, sortedReports],
  );

  useEffect(() => () => clearHoverTimer(), [clearHoverTimer]);

  useEffect(() => {
    setViewMode(null);
  }, [result?.statement_id, activeStatementId]);

  useEffect(() => {
    if (viewMode !== 'month') return;
    if (!(activeStatementId || analysis)) {
      setViewMode(null);
    }
  }, [activeStatementId, analysis, viewMode]);

  // Same statement resolution as Overview / Cash flow / AT Letter (pin → session → newest month).
  useEffect(() => {
    if (!historyReady || analysis) return;

    const sessionAnalysis = getAnalyzeAnalysis(result);
    const targetId =
      resolveAtLetterStatementId({
        sessionStatementId: result?.statement_id,
        sessionPeriodKey: periodKeyFromLabel(sessionAnalysis?.period_label),
        primaryReport,
        historyReady: true,
        preferSession: hasRecentAnalyzeSession(),
        activeViewId: getActiveStatementViewId(),
      })?.trim() || null;

    if (!targetId) return;
    if (hydrateAttemptRef.current === targetId) return;

    const cached = getCachedCalculatorReport(targetId);
    if (cached) {
      hydrateAttemptRef.current = targetId;
      loadSavedReport(cached);
      return;
    }

    let cancelled = false;
    hydrateAttemptRef.current = targetId;
    setHydrating(true);
    setHydrateError(null);
    const hint =
      primaryReport?.statement_id === targetId
        ? primaryReport.period_label
        : savedReports.find((r) => r.statement_id === targetId)?.period_label;
    setLoadStatus(
      hint?.trim()
        ? `Opening ${hint.trim()} from your saved statements…`
        : 'Opening your saved statement…',
    );
    void fetchSavedReport(targetId)
      .then(({ data }) => {
        if (!cancelled) {
          putCachedCalculatorReport(data);
          loadSavedReport(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          hydrateAttemptRef.current = null;
          setHydrateError(
            'Could not load your saved statements. Open Overview once, then return here.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setHydrating(false);
          setLoadStatus(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [historyReady, analysis, result, primaryReport, savedReports, loadSavedReport]);

  useEffect(() => {
    if (!selectedId) return;
    setValues(mergeDefaults(selectedId, statementDefaultsFor(selectedId, result)));
  }, [selectedId, result?.statement_id, result?.analysis]);

  // Drop leftover /calculators/:slug so a prior visit doesn’t open a panel or group.
  useEffect(() => {
    if (!slug) return;
    navigate('/dashboard/calculators', { replace: true });
  }, [slug, navigate]);

  const setField = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const applyStatementDefaults = (id: CalculatorId) => {
    setValues(mergeDefaults(id, statementDefaultsFor(id, result)));
  };

  const openCalculator = (id: CalculatorId) => {
    setSelectedId(id);
    applyStatementDefaults(id);
  };

  const closeCalculator = () => {
    setSelectedId(null);
    setValues({});
  };

  const healthOverview = useMemo(
    () => buildCalculatorHealthOverview(result, evaluateRisk),
    [result, evaluateRisk, prefs],
  );

  const performance = useMemo(
    () => (monthOnly ? null : buildCalculatorPerformance(rollingResults)),
    [monthOnly, rollingResults],
  );

  const rollingKey = useMemo(
    () =>
      rollingWindowKey(
        sortedReports.slice(-3).map((r) => r.statement_id),
      ),
    [sortedReports],
  );

  // Keep current in-memory statement in the rolling cache (session + durable).
  useEffect(() => {
    if (!result?.statement_id || !getAnalyzeAnalysis(result)) return;
    rollingCacheRef.current.set(result.statement_id, result);
    putCachedCalculatorReport(result);
  }, [result]);

  // Prefetch Last 3 months in the background once history is ready (so hover is instant).
  useEffect(() => {
    if (!historyReady || !sortedReports.length) return;
    const latest = sortedReports.slice(-3);
    const key = rollingWindowKey(latest.map((r) => r.statement_id));
    if (!key || getCachedRollingWindow(key)) return;

    let cancelled = false;
    void (async () => {
      const loaded: AnalyzeResult[] = [];
      for (const row of latest) {
        if (cancelled) return;
        const hit =
          (result?.statement_id === row.statement_id && getAnalyzeAnalysis(result)
            ? result
            : null) ?? getCachedCalculatorReport(row.statement_id);
        if (hit) {
          putCachedCalculatorReport(hit);
          loaded.push(hit);
          continue;
        }
        try {
          const { data } = await fetchSavedReport(row.statement_id);
          putCachedCalculatorReport(data);
          loaded.push(data);
        } catch {
          return;
        }
      }
      if (!cancelled && loaded.length === latest.length) {
        putCachedRollingWindow(key, loaded);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [historyReady, rollingKey, sortedReports, result?.statement_id]);

  // Load latest ≤3 months once; reuse durable cache on hover / tab revisit.
  useEffect(() => {
    if (monthOnly) return;
    if (!sortedReports.length) {
      setRollingResults([]);
      setLoadStatus(null);
      setRollingLoading(false);
      return;
    }

    const latest = sortedReports.slice(-3);
    const windowHit = getCachedRollingWindow(rollingKey);
    if (windowHit && windowHit.length === latest.length) {
      for (const r of windowHit) {
        if (r.statement_id) rollingCacheRef.current.set(r.statement_id, r);
      }
      setRollingResults(windowHit);
      setRollingLoading(false);
      setRollingError(null);
      setLoadStatus(null);
      return;
    }

    const cached = latest
      .map(
        (row) =>
          rollingCacheRef.current.get(row.statement_id) ??
          getCachedCalculatorReport(row.statement_id),
      )
      .filter((r): r is AnalyzeResult => Boolean(r && getAnalyzeAnalysis(r)));
    if (cached.length === latest.length) {
      putCachedRollingWindow(rollingKey, cached);
      setRollingResults(cached);
      setRollingLoading(false);
      setRollingError(null);
      setLoadStatus(null);
      return;
    }

    // Show whatever we already have while fetching the rest — avoid a full blank loader.
    if (cached.length > 0) {
      setRollingResults(cached);
    }

    let cancelled = false;
    setRollingLoading(true);
    setRollingError(null);
    const missing = latest.filter(
      (row) =>
        !(
          rollingCacheRef.current.has(row.statement_id) ||
          getCachedCalculatorReport(row.statement_id)
        ),
    );
    setLoadStatus(
      missing.length
        ? `Opening ${missing.length} saved month${missing.length === 1 ? '' : 's'}…`
        : 'Preparing trend view…',
    );

    void (async () => {
      try {
        const loaded: AnalyzeResult[] = [];
        for (let i = 0; i < latest.length; i += 1) {
          const row = latest[i]!;
          if (cancelled) return;
          const label = (row.period_label || row.period_key || 'statement').trim();
          const hit =
            rollingCacheRef.current.get(row.statement_id) ??
            getCachedCalculatorReport(row.statement_id);
          if (hit && getAnalyzeAnalysis(hit)) {
            rollingCacheRef.current.set(row.statement_id, hit);
            loaded.push(hit);
            continue;
          }
          setLoadStatus(`Opening ${label}… (${i + 1} of ${latest.length})`);
          if (result?.statement_id === row.statement_id && getAnalyzeAnalysis(result)) {
            rollingCacheRef.current.set(row.statement_id, result);
            putCachedCalculatorReport(result);
            loaded.push(result);
            continue;
          }
          const { data } = await fetchSavedReport(row.statement_id);
          rollingCacheRef.current.set(row.statement_id, data);
          putCachedCalculatorReport(data);
          loaded.push(data);
        }
        if (!cancelled) {
          putCachedRollingWindow(rollingKey, loaded);
          setRollingResults(loaded);
        }
      } catch {
        if (!cancelled) {
          setRollingError('Could not load months for the trend view. Try again.');
          if (!cached.length) setRollingResults([]);
        }
      } finally {
        if (!cancelled) {
          setRollingLoading(false);
          setLoadStatus(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally omit `result` object identity — statement id is enough via rollingKey/cache.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- result used only as same-id shortcut
  }, [monthOnly, rollingKey, sortedReports]);

  const switchStatement = async (statementId: string) => {
    if (!statementId || statementId === result?.statement_id || hydrating) return;
    const cached =
      rollingCacheRef.current.get(statementId) ?? getCachedCalculatorReport(statementId);
    if (cached && getAnalyzeAnalysis(cached)) {
      rollingCacheRef.current.set(statementId, cached);
      loadSavedReport(cached);
      return;
    }
    const row = savedReports.find((r) => r.statement_id === statementId);
    const label = (row?.period_label || row?.period_key || 'that month').trim();
    setHydrating(true);
    setHydrateError(null);
    setLoadStatus(`Opening ${label}…`);
    hydrateAttemptRef.current = statementId;
    try {
      const { data } = await fetchSavedReport(statementId);
      rollingCacheRef.current.set(statementId, data);
      putCachedCalculatorReport(data);
      loadSavedReport(data);
    } catch {
      hydrateAttemptRef.current = null;
      setHydrateError('Could not open that month. Try again from Reports.');
    } finally {
      setHydrating(false);
      setLoadStatus(null);
    }
  };

  const openFromPerformance = async (id: CalculatorId) => {
    const last = performance?.months[performance.months.length - 1];
    if (last && last.statementId !== result?.statement_id) {
      await switchStatement(last.statementId);
    }
    setViewMode('month');
    setSelectedId(id);
    if (!last || last.statementId === result?.statement_id) {
      applyStatementDefaults(id);
    }
  };

  const monthsOnFile = Math.min(Math.max(savedCount, activeStatementId ? 1 : 0), 3);

  /** Same meta line pattern as AT Letter under the view bar. */
  const viewMeta = useMemo(() => {
    if (!monthOnly) {
      if (monthsOnFile >= 3) {
        return 'Quarter view — comparing your latest 3 months on file.';
      }
      if (monthsOnFile === 2) {
        return 'Comparing your latest 2 months on file.';
      }
      return 'Upload more months to unlock a 3-month quarter comparison.';
    }
    const label = analysis?.period_label?.trim() || 'Selected month';
    return `${label} only — single-month calculators, no rolling comparison.`;
  }, [monthOnly, monthsOnFile, analysis?.period_label]);

  const monthsOnFileChip =
    monthsOnFile > 0 ? (
      <div className={styles.historyBar}>
        <div className={styles.historyChips}>
          {monthsOnFile === 1 ? (
            <div className={styles.historyChip}>
              <span>1</span> First upload
            </div>
          ) : (
            <div className={styles.historyChip}>
              <span>{monthsOnFile}</span> months on file
            </div>
          )}
        </div>
        <p className={styles.historyNote}>
          {monthsOnFile <= 1
            ? 'This is your first upload on file.'
            : monthsOnFile === 2
              ? monthOnly
                ? 'Second month on file — prior month saved for rolling comparison.'
                : 'Second month on file — comparing 2 months.'
              : monthOnly
                ? 'Three months on file — use Last 3 months for full quarter comparison.'
                : 'Three months on file — full quarter view.'}
        </p>
      </div>
    ) : null;

  /** Same two options as AT Letter — Last 3 months | {month} only. */
  const letterViewBar = showViewFilters ? (
    <div className={styles.viewBar}>
      <div className={styles.viewTitle}>Calculator view</div>
      <div className={styles.viewFilterRow} onMouseLeave={clearHoverTimer}>
        <button
          type="button"
          className={`${styles.viewFilter} ${activeView === ROLLING_VIEW ? styles.viewFilterActive : ''}`}
          onMouseEnter={() => selectViewOnHover('rolling')}
          onClick={() => {
            const key = rollingWindowKey(sortedReports.slice(-3).map((r) => r.statement_id));
            const hit = key ? getCachedRollingWindow(key) : undefined;
            if (hit) {
              setRollingResults(hit);
              setRollingLoading(false);
              setLoadStatus(null);
            }
            setViewMode('rolling');
          }}
        >
          Last 3 months
        </button>
        <button
          type="button"
          className={`${styles.viewFilter} ${activeView !== ROLLING_VIEW ? styles.viewFilterActive : ''}`}
          onMouseEnter={() => selectViewOnHover('month')}
          onClick={() => {
            if (activeStatementId || analysis) setViewMode('month');
          }}
        >
          {monthOnlyLabelFromPeriod(analysis?.period_label)}
        </button>
      </div>
    </div>
  ) : null;

  const resultBlock = useMemo(() => {
    if (!active) return null;
    const v = values;
    const num = (key: string) => Number(v[key]);
    const o = (key: string) => optN(v[key]);

    switch (active.id) {
      case 'cash-runway': {
        const out = calcCashRunway(num('cash'), num('burn'), {
          overdraftFees: o('overdraft'),
          loanPenalties: o('loanPenalties'),
          processingFees: o('processingFees'),
          taxes: o('taxes'),
        });
        if (!out) return <p className={styles.empty}>Need cash on hand and monthly burn from your statements.</p>;
        const cashAmt = num('cash');
        const burnAmt = num('burn');
        const runwayKpi = analysis?.kpis?.find((k) => k.id === 'days_of_runway')?.value;
        const daysPerMonth = 365.25 / 12;
        const burnFromKpi =
          cashAmt > 0 &&
          runwayKpi != null &&
          runwayKpi > 0 &&
          Math.abs(burnAmt - (cashAmt * daysPerMonth) / runwayKpi) < 0.02;
        const formulaLines = [
          burnFromKpi
            ? [
                'Monthly burn (from statement runway KPI):',
                `burn = cash × (365.25 ÷ 12) ÷ runway_days`,
                `burn = ${fmtMoney2(cashAmt)} × ${daysPerMonth.toFixed(4)} ÷ ${runwayKpi}`,
                `burn = ${fmtMoney2(burnAmt)}`,
                '',
              ].join('\n')
            : '',
          'Runway (this calculator):',
          `daily_burn = monthly_burn ÷ (365.25 ÷ 12)`,
          `daily_burn = ${fmtMoney2(burnAmt)} ÷ ${daysPerMonth.toFixed(4)} = ${fmtMoney2(out.dailyBurn)}`,
          `runway_days = cash ÷ daily_burn`,
          `runway_days = ${fmtMoney2(cashAmt)} ÷ ${fmtMoney2(out.dailyBurn)} = ${out.days.toFixed(1)} days`,
        ]
          .filter(Boolean)
          .join('\n');
        return (
          <ResultBlock
            title="Your runway"
            main={fmtDays(out.days)}
            sub={`About ${out.months.toFixed(1)} months · daily burn ${fmtMoney2(out.dailyBurn)}/day.`}
            risk={evaluateRisk('cash-runway', out.days)}
            formula={formulaLines}
            assumptions={
              burnFromKpi
                ? `Cash ${fmtMoney(cashAmt)} from bank ending balance. Monthly burn ${fmtMoney(burnAmt)} is backed out from Overview “Days of Runway” (${runwayKpi} days) so the math matches that KPI.`
                : `Cash and monthly burn as entered (statement cash when available).`
            }
            tip={
              out.days < 30
                ? 'Tip: Under 30 days of runway is tight.'
                : out.days < 90
                  ? 'Tip: Some cushion — watch weekly cash.'
                  : 'Tip: Solid cushion — still review burn monthly.'
            }
          />
        );
      }
      case 'cash-flow-forecast': {
        const out = calcCashFlowForecast(num('cash'), num('inflow'), num('outflow'), {
          interestIncome: o('interest'),
          penalties: o('penalties'),
          oneTimeFeesMonthly: o('oneTimeFees'),
          monthlyGrowthPct: o('growth'),
        });
        if (!out) return <p className={styles.empty}>Need starting cash, monthly in, and monthly out from statements.</p>;
        const net = out.effectiveIn - out.effectiveOut;
        const lowest = Math.min(...out.months.map((m) => m.cash));
        const oneMonthFixed = Math.max(out.effectiveOut, 0);
        return (
          <ResultBlock
            title="Cash in 12 months"
            main={fmtMoney(out.endingCash)}
            sub={`Month 6 ≈ ${fmtMoney(out.months[5].cash)} · Month 12 ≈ ${fmtMoney(out.months[11].cash)}`}
            risk={evaluateRisk('cash-flow-forecast', lowest, {
              highRisk: 0,
              lowRisk: oneMonthFixed,
              highLabel: 'Any month < $0',
              lowLabel: `Above ${fmtMoney(oneMonthFixed)} (1 mo outflows)`,
            })}
            formula={[
              `base_net = ${out.effectiveIn} − ${out.effectiveOut} = ${net}`,
              `ending_cash = ${out.endingCash}`,
            ].join('\n')}
            assumptions="Uses statement cash on hand plus this period’s money in / money out as a monthly run-rate."
            tip={
              out.endingCash < 0
                ? 'Tip: Projection turns negative — plan cuts or revenue lifts.'
                : 'Tip: Recheck with quieter months so the plan is not too optimistic.'
            }
          />
        );
      }
      case 'weekly-cash-flow': {
        const out = calcWeeklyTracker(num('target'), num('week'), num('soFar'), {
          refunds: o('refunds'),
          chargebacks: o('chargebacks'),
          fees: o('fees'),
        });
        if (!out) {
          return (
            <p className={styles.empty}>
              Need statement monthly revenue and week count. Open Reports → Week once if week count is
              missing, or enter revenue so far.
            </p>
          );
        }
        return (
          <ResultBlock
            title={out.onTrack ? 'On track this week' : 'Behind this week'}
            main={fmtMoney(out.variance)}
            sub={`Expected ${fmtMoney(out.expectedByNow)} · net ${fmtMoney(out.netRevenue)} (${fmtPct(out.pctOfMonth)} of target).`}
            risk={evaluateRisk('weekly-cash-flow', out.onTrack ? 0 : 1)}
            formula={[
              'expected = target × (week × 7) ÷ (365.25 ÷ 12)',
              `variance = ${out.variance.toFixed(2)}`,
            ].join('\n')}
            assumptions="Target and revenue-so-far from this statement period; week count from weekly rollups."
            tip={out.onTrack ? 'Tip: Nice pace — protect margin too.' : 'Tip: Behind even pace — a mid-week push can still recover.'}
          />
        );
      }
      case 'net-margin': {
        const out = calcNetMargin(num('revenue'), o('cogs'), num('opex'), {
          interest: o('interest'),
          loanPenalties: o('loanPenalties'),
          processingFees: o('processingFees'),
        });
        if (!out) return <p className={styles.empty}>Need revenue and expenses from statements.</p>;
        return (
          <ResultBlock
            title="Net margin"
            main={fmtPct(out.netMarginPct)}
            sub={`Net profit ${fmtMoney(out.netProfit)}.`}
            risk={evaluateRisk('net-margin', out.netMarginPct)}
            formula={[
              `net_profit = ${v.revenue} − ${v.cogs || '0'} − ${v.opex} = ${out.netProfit}`,
              `net_margin_% = ${out.netMarginPct.toFixed(2)}%`,
            ].join('\n')}
            assumptions="Revenue and OpEx from this statement. COGS stays blank unless you enter it (not assumed)."
            tip={
              out.netMarginPct < 0
                ? 'Tip: Expenses exceed revenue on these numbers.'
                : 'Tip: Compare to your industry band and watch fee creep.'
            }
          />
        );
      }
      case 'gross-margin': {
        const out = calcGrossMargin(num('revenue'), o('cogs'), {
          processingFees: o('processingFees'),
          returns: o('returns'),
          shipping: o('shipping'),
          penalties: o('penalties'),
        });
        if (!out) {
          return (
            <p className={styles.empty}>
              Need statement revenue. Enter COGS if you know it; fees/returns prefill from statements.
            </p>
          );
        }
        return (
          <ResultBlock
            title="Gross / contribution margin"
            main={fmtPct(out.marginPct)}
            sub={`Accounting gross ${fmtMoney(out.accountingGrossProfit)} (${fmtPct(out.accountingMarginPct)}) · after fees/returns ${fmtMoney(out.grossProfit)}.`}
            risk={evaluateRisk('gross-margin', out.marginPct)}
            formula={[
              `accounting = revenue − COGS = ${fmtMoney2(num('revenue'))} − ${fmtMoney2(o('cogs'))}`,
              `after_extras = accounting − fees − returns = ${fmtMoney2(out.grossProfit)}`,
              `margin_% = ${out.marginPct.toFixed(2)}%`,
            ].join('\n')}
            assumptions="Revenue, processing fees, and refunds from this statement. COGS blank unless you enter it (not invented)."
            tip={
              o('cogs') <= 0
                ? 'Tip: Without COGS this is margin after fees/returns only — enter COGS for true gross margin.'
                : 'Tip: Watch fee and return drag on contribution.'
            }
          />
        );
      }
      case 'break-even': {
        const out = calcBreakEven(num('fixed'), num('margin'), {
          processingFeePct: o('processingFeePct'),
          loanCharges: o('loanCharges'),
          salesTaxAbsorbedPct: o('salesTax'),
        });
        if (!out) {
          return (
            <p className={styles.empty}>
              Need fixed costs and a contribution margin % from statements (or enter them).
            </p>
          );
        }
        const stmtRevenue =
          analysis?.kpis?.find((k) => k.id === 'revenue')?.value ??
          analysis?.cash_flow?.money_in ??
          analysis?.financial_summary?.total_gross ??
          (Number.isFinite(num('revenue')) && num('revenue') > 0 ? num('revenue') : NaN);
        const revenuePctOfBe =
          out.monthlyRevenue > 0 && Number.isFinite(stmtRevenue) && stmtRevenue > 0
            ? (stmtRevenue / out.monthlyRevenue) * 100
            : null;
        return (
          <ResultBlock
            title="Break-even monthly sales"
            main={fmtMoney(out.monthlyRevenue)}
            sub={`≈ ${fmtMoney(out.weeklyRevenue)}/week · ${fmtMoney(out.dailyRevenue)}/day · effective margin ${fmtPct(out.effectiveMarginPct)}.`}
            risk={
              revenuePctOfBe != null ? evaluateRisk('break-even', revenuePctOfBe) : null
            }
            formula={[
              'break_even = fixed_costs ÷ (contribution_margin_% ÷ 100)',
              `break_even = ${fmtMoney2(out.effectiveFixed)} ÷ (${out.effectiveMarginPct.toFixed(2)} ÷ 100)`,
              `= ${fmtMoney2(out.monthlyRevenue)} / month`,
              revenuePctOfBe != null
                ? `revenue ÷ break_even = ${stmtRevenue} ÷ ${out.monthlyRevenue.toFixed(2)} = ${revenuePctOfBe.toFixed(1)}%`
                : '',
            ]
              .filter(Boolean)
              .join('\n')}
            assumptions="Fixed costs ≈ this period’s money out (or burn). Margin ≈ (revenue − fees − refunds) ÷ revenue when COGS is not on the statement."
            tip={
              out.monthlyRevenue > num('fixed') * 3
                ? 'Tip: High break-even vs costs — margin may be thin after fees.'
                : 'Tip: Compare break-even to this month’s actual revenue on Overview.'
            }
          />
        );
      }
      case 'processor-compare': {
        const stmtRates = statementProcessorRates(result);
        const rateRows = stmtRates
          .map((r) => ({
            name: r.label,
            ratePct: num(r.key),
            raw: v[r.key] ?? '',
          }))
          .filter((r) => r.raw !== '' && Number.isFinite(r.ratePct) && r.ratePct >= 0);
        if (!rateRows.length) {
          return (
            <p className={styles.empty}>
              Upload POS / e-commerce statements with fees so we can show each processor’s rate from
              your files.
            </p>
          );
        }
        const out = calcProcessorFees(
          num('volume'),
          rateRows.map(({ name, ratePct }) => ({ name, ratePct })),
          {
            monthlyGatewayFee: o('gatewayMonthly'),
            chargebackFeesAnnual: o('chargebacks'),
            pciFeesAnnual: o('pci'),
            perTxnFee: o('perTxn'),
            avgTicket: o('avgTicket'),
          },
        );
        if (!out) {
          return (
            <p className={styles.empty}>
              Need your statement card volume (annualized from this month’s gross) to estimate yearly
              fees.
            </p>
          );
        }
        const sorted = [...out].sort((a, b) => a.annualFee - b.annualFee);
        const cheapest = sorted[0];
        const blendedRate =
          rateRows.reduce((s, r) => s + r.ratePct, 0) / rateRows.length;
        return (
          <ResultBlock
            title="What this means"
            main={
              cheapest
                ? `${cheapest.name} is cheapest on this volume · ${fmtMoney(cheapest.annualFee)}/year`
                : '—'
            }
            sub={`Using this month’s card sales × 12 (= ${fmtMoney(num('volume'))} annual volume) and each processor’s fee % from your statements.`}
            risk={evaluateRisk('processor-compare', blendedRate)}
            formula={[
              'For each processor on your statement:',
              'estimated_yearly_fees ≈ annual_volume × fee_%',
              ...sorted.map(
                (r) =>
                  `${r.name}: ${fmtMoney(num('volume'))} × ${fmtPct(r.ratePct)} ≈ ${fmtMoney(r.annualFee)}/year`,
              ),
            ].join('\n')}
            assumptions="Names and fee % are taken from processors on this upload (e.g. POS, E-commerce) — not Square/Stripe brand defaults."
            tip="This is a cost estimate at today’s rates on the same sales volume — not a bill you already paid."
          >
            <ul className={styles.resultList}>
              {sorted.map((row) => (
                <li key={row.name}>
                  <span>
                    {row.name} ({fmtPct(row.ratePct)} fee)
                  </span>
                  <strong>{fmtMoney(row.annualFee)}/yr</strong>
                </li>
              ))}
            </ul>
          </ResultBlock>
        );
      }
      case 'payroll-pct-revenue': {
        const out = calcPayrollPct(num('payroll'), num('revenue'), {
          contractors: o('contractors'),
          bonuses: o('bonuses'),
          agencyMarkups: o('agency'),
        });
        if (!out) {
          return (
            <p className={styles.empty}>
              Need payroll and revenue from statements. If payroll is blank, it was not tagged on outflows.
            </p>
          );
        }
        return (
          <ResultBlock
            title="Payroll as % of revenue"
            main={fmtPct(out.pct)}
            sub={`Labor ${fmtMoney(out.effectivePayroll)} vs revenue ${fmtMoney(num('revenue'))}.`}
            risk={evaluateRisk('payroll-pct-revenue', out.pct)}
            formula={`payroll_% = ${out.effectivePayroll} ÷ ${v.revenue} × 100 = ${out.pct.toFixed(2)}%`}
            assumptions="Payroll from outflow categories tagged payroll/wages; revenue from statement KPIs."
            tip={
              out.pct > 35
                ? 'Tip: Payroll looks high vs many industries.'
                : 'Tip: Rising payroll % without rising sales is an early warning.'
            }
          />
        );
      }
      case 'hiring-affordability': {
        if (!v.salary || !(num('salary') > 0)) {
          return (
            <p className={styles.empty}>
              Cash and burn are from your statements. Enter the new hire’s all-in monthly salary to see
              runway impact.
            </p>
          );
        }
        const out = calcHiringImpact(num('cash'), num('burn'), num('salary'), {
          recruitingFees: o('recruiting'),
          trainingMonthly: o('training'),
          overtimeMonthly: o('overtime'),
          severanceMonthly: o('severance'),
          contributionMarginPct: o('contributionMargin'),
        });
        if (!out) {
          return <p className={styles.empty}>Need statement cash, burn, and a hire salary.</p>;
        }
        return (
          <ResultBlock
            title="Runway if you hire"
            main={`${fmtDays(out.runwayBeforeDays)} → ${fmtDays(out.runwayAfterDays)}`}
            sub={`Hire cost ${fmtMoney(out.hireMonthly)}/mo · extra revenue needed ${fmtMoney(out.extraRevenueNeeded)}${out.usedContributionMargin ? ' (using contribution margin)' : ''}.`}
            risk={evaluateRisk('hiring-affordability', out.runwayAfterDays)}
            formula={[
              `runway_before = cash ÷ burn × (365.25÷12) = ${out.runwayBeforeDays.toFixed(1)} days`,
              `runway_after = (cash − recruiting) ÷ (burn + hire) × (365.25÷12) = ${out.runwayAfterDays.toFixed(1)} days`,
            ].join('\n')}
            assumptions="Cash and burn from statements (same as Cash Runway). Salary is your what-if — not invented."
            tip={
              out.runwayAfterDays < 30
                ? 'Tip: Hiring would leave under 30 days of runway — risky without more cash or sales.'
                : 'Tip: Check that extra revenue needed is realistic for the role.'
            }
          />
        );
      }
      case 'roi': {
        const out = calcRoi(num('investment'), num('returnAmount'), {
          financingFees: o('financingFees'),
          taxesOnGain: o('taxes'),
          penalties: o('penalties'),
          monthsHeld: o('monthsHeld'),
        });
        if (!out) {
          return (
            <p className={styles.empty}>
              Need statement money out (investment) and money in (return) for this period.
            </p>
          );
        }
        return (
          <ResultBlock
            title="Period cash ROI"
            main={fmtPct(out.roiPct)}
            sub={`Profit ${fmtMoney(out.profit)} · net return ${fmtMoney(out.netReturn)} on ${fmtMoney(out.netInvestment)}${out.annualizedRoiPct != null ? ` · annualized ≈ ${fmtPct(out.annualizedRoiPct)}` : ''}.`}
            risk={evaluateRisk('roi', out.roiPct)}
            formula={[
              'ROI% = (return − investment) ÷ investment × 100',
              `ROI% = (${fmtMoney2(out.netReturn)} − ${fmtMoney2(out.netInvestment)}) ÷ ${fmtMoney2(out.netInvestment)} × 100`,
              `= ${out.roiPct.toFixed(2)}%`,
              out.annualizedRoiPct != null
                ? `annualized ≈ ((1 + ROI)^(12 ÷ months) − 1) × 100 = ${out.annualizedRoiPct.toFixed(2)}%`
                : '',
            ]
              .filter(Boolean)
              .join('\n')}
            assumptions="Investment = this period’s money out; return = money in — both from your cash-flow statement view. Not a project/deal ROI unless you change the inputs."
            tip={
              out.roiPct < 0
                ? 'Tip: Money out exceeded money in this period.'
                : 'Tip: This is one month’s cash ROI — compare across months, not to stock-market ROI.'
            }
          />
        );
      }
      case 'buy-vs-lease': {
        if (!v.price || !v.months || !v.lease) {
          return (
            <p className={styles.empty}>
              Enter the equipment purchase price, lease term (months), and monthly lease from your
              quote. Statement cash below is context only — quotes aren’t on bank statements.
            </p>
          );
        }
        const out = calcBuyVsLease(num('price'), num('months'), num('lease'), {
          buyTax: o('buyTax'),
          buyInterest: o('buyInterest'),
          buyMaintenance: o('buyMaintenance'),
          residualValue: o('residual'),
          leaseTax: o('leaseTax'),
          leaseMaintenance: o('leaseMaintenance'),
          earlyTerminationPenalty: o('earlyTermination'),
          discountRatePct: o('discountRate'),
        });
        if (!out) {
          return <p className={styles.empty}>Need purchase price, lease months, and monthly lease.</p>;
        }
        const cashAvail = o('cashAvailable');
        const canBuy =
          cashAvail != null && cashAvail > 0
            ? cashAvail >= out.buyBreakdown.price
              ? ` Statement cash ${fmtMoney(cashAvail)} covers purchase price.`
              : ` Statement cash ${fmtMoney(cashAvail)} is below purchase price ${fmtMoney(out.buyBreakdown.price)}.`
            : '';
        const label = out.usedNpv ? 'NPV cost' : 'Cash cost';
        const runwayKpi = analysis?.kpis?.find((k) => k.id === 'days_of_runway')?.value;
        const daysPerMonth = 365.25 / 12;
        const burnMo =
          cashAvail > 0 && runwayKpi != null && runwayKpi > 0
            ? (cashAvail * daysPerMonth) / runwayKpi
            : 0;
        const buyPrice = out.buyBreakdown.price;
        const monthsConsumed =
          burnMo > 0 && buyPrice > 0 ? buyPrice / burnMo : null;
        return (
          <ResultBlock
            title={
              out.cheaper === 'same'
                ? 'Buy and lease cost the same'
                : out.cheaper === 'buy'
                  ? 'Buying is cheaper'
                  : 'Leasing is cheaper'
            }
            main={`${label}: buy ${fmtMoney(out.buyTotal)} · lease ${fmtMoney(out.leaseTotal)}`}
            sub={`${out.usedNpv ? `NPV at ${out.discountRatePct}% cost of capital. ` : 'Undiscounted cash totals. '}Difference ${fmtMoney(Math.abs(out.buyTotal - out.leaseTotal))}.${canBuy}`}
            risk={
              monthsConsumed != null
                ? evaluateRisk('buy-vs-lease', monthsConsumed)
                : null
            }
            formula={[
              out.usedNpv
                ? 'Buy NPV ≈ price + tax + interest + maint − PV(residual)'
                : 'Buy total = price + tax + interest + maint − residual',
              out.usedNpv
                ? 'Lease NPV ≈ PV(monthly payments) + lease tax + maint + PV(early exit)'
                : 'Lease total = monthly × months + lease tax + maint + early exit',
              `buy = ${fmtMoney2(out.buyTotal)} · lease = ${fmtMoney2(out.leaseTotal)}`,
              monthsConsumed != null
                ? `runway_months_consumed ≈ buy_price ÷ monthly_burn = ${monthsConsumed.toFixed(2)} mo`
                : '',
            ]
              .filter(Boolean)
              .join('\n')}
            assumptions="Purchase price and lease terms come from your equipment quote — not from statements. Optional tax/interest/maintenance/residual improve the comparison. Discount rate turns cash totals into NPV."
            tip={
              out.cheaper === 'lease'
                ? 'Tip: Leasing wins on total cost here — still check residual ownership and early-exit fees.'
                : out.cheaper === 'buy'
                  ? 'Tip: Buying wins on total cost — confirm you can fund the upfront cash without starving runway.'
                  : 'Tip: Costs match within a penny — decide on ownership vs flexibility.'
            }
          />
        );
      }
      case 'late-payment-cost': {
        if (!v.amount || !v.daysLate || v.costOfCapital === undefined || v.costOfCapital === '') {
          return (
            <p className={styles.empty}>
              Enter the overdue invoice amount, days late, and your annual cost of capital %. Fees are
              optional. Bank statements don’t include AR aging.
            </p>
          );
        }
        const out = calcLatePaymentCost(num('amount'), num('daysLate'), num('costOfCapital'), {
          lateFees: o('lateFees'),
          collectionFees: o('collectionFees'),
          legalCosts: o('legalCosts'),
        });
        if (!out) {
          return (
            <p className={styles.empty}>Need amount &gt; 0, days late &gt; 0, and cost of capital ≥ 0.</p>
          );
        }
        return (
          <ResultBlock
            title="True cost of being paid late"
            main={fmtMoney(out.totalCost)}
            sub={`Opportunity cost ${fmtMoney(out.opportunityCost)} · fees ${fmtMoney(out.extraFees)} · ≈ ${fmtMoney(out.dailyCost)}/day late.`}
            risk={evaluateRisk('late-payment-cost', num('daysLate'))}
            formula={[
              'opportunity = amount × (cost_of_capital% ÷ 100) × (days ÷ 365)',
              `opportunity = ${fmtMoney2(num('amount'))} × ${(num('costOfCapital') / 100).toFixed(4)} × (${num('daysLate')} ÷ 365)`,
              `= ${fmtMoney2(out.opportunityCost)}`,
              `total = opportunity + late/collection/legal fees = ${fmtMoney2(out.totalCost)}`,
            ].join('\n')}
            assumptions="Amount and days late come from your invoice/AR records — not from bank or POS statements. Cost of capital is your what-if rate (e.g. LOC interest or target return)."
            tip={
              out.totalCost > num('amount') * 0.05
                ? 'Tip: Late cost is over 5% of the invoice — tighten terms or chase sooner.'
                : 'Tip: Small vs invoice size — still useful when many invoices pile up.'
            }
          />
        );
      }
      case 'employee-true-cost': {
        if (!v.salary || v.burden === undefined || v.burden === '') {
          return (
            <p className={styles.empty}>
              Enter annual salary and employer burden % (FICA, unemployment, workers’ comp, benefits —
              often 25–40% for US SMBs). Statements don’t show per-employee true cost.
            </p>
          );
        }
        const out = calcEmployeeTrueCost(num('salary'), num('burden'), {
          signingBonus: o('signingBonus'),
          severance: o('severance'),
        });
        if (!out) {
          return <p className={styles.empty}>Need annual salary &gt; 0 and burden % ≥ 0.</p>;
        }
        return (
          <ResultBlock
            title="Fully loaded employee cost"
            main={fmtMoney(out.allIn)}
            sub={`Burden extras ${fmtMoney(out.extras)} · one-time ${fmtMoney(out.oneTime)} · ≈ ${fmtMoney(out.monthlyAllIn)}/mo.`}
            formula={[
              'all_in = salary × (1 + burden%) + signing + severance',
              `all_in = ${fmtMoney2(num('salary'))} × (1 + ${(num('burden') / 100).toFixed(4)}) + one-time`,
              `= ${fmtMoney2(out.allIn)}`,
              `monthly ≈ all_in ÷ 12 = ${fmtMoney2(out.monthlyAllIn)}`,
            ].join('\n')}
            assumptions="Salary and burden come from your offer/HR numbers — not from bank payroll totals (those are company-wide). Burden % is your estimate; we don’t invent a default rate."
            tip={
              num('burden') < 20
                ? 'Tip: Under 20% burden is low for US employers — double-check benefits and payroll taxes.'
                : 'Tip: Use monthly all-in in Hiring Affordability as the hire salary.'
            }
          />
        );
      }
      case 'loan-affordability': {
        if (!v.principal || !v.rate || !v.months) {
          return (
            <p className={styles.empty}>
              Free cash is from your statement (money in − money out). Enter the loan amount, APR %,
              and term in months from your quote to see the payment and whether you can afford it.
            </p>
          );
        }
        if (v.freeCash === undefined || v.freeCash === '') {
          return (
            <p className={styles.empty}>
              Need statement free cash (money in − money out) plus loan amount, rate, and term.
            </p>
          );
        }
        const out = calcLoanPayment(num('principal'), num('rate'), num('months'), num('freeCash'), {
          originationFee: o('origination'),
          monthlyInsurance: o('insurance'),
          prepaymentPenalty: o('prepay'),
        });
        if (!out) {
          return (
            <p className={styles.empty}>Need principal &gt; 0, term &gt; 0, rate ≥ 0, and free cash.</p>
          );
        }
        const coverage =
          Number.isFinite(out.fcfCoveragePct) && out.fcfCoveragePct !== Infinity
            ? `${out.fcfCoveragePct.toFixed(0)}% of free cash`
            : 'no free cash to cover payment';
        const dscr =
          out.monthlyAllIn > 0 && Number.isFinite(num('freeCash'))
            ? num('freeCash') / out.monthlyAllIn
            : null;
        return (
          <ResultBlock
            title={out.affordable ? 'Looks affordable on this month’s cash' : 'Tight vs this month’s free cash'}
            main={`${fmtMoney(out.monthlyAllIn)}/mo`}
            sub={`P&I ${fmtMoney(out.payment)} · total interest ${fmtMoney(out.totalInterest)} · total paid ${fmtMoney(out.totalPaid)} · uses ${coverage}.`}
            risk={dscr != null ? evaluateRisk('loan-affordability', dscr) : null}
            formula={[
              'PMT = P × r(1+r)^n ÷ ((1+r)^n − 1), r = APR÷12',
              `payment = ${fmtMoney2(out.payment)} · all-in = payment + insurance = ${fmtMoney2(out.monthlyAllIn)}`,
              `affordable if free_cash ≥ all-in → ${fmtMoney2(num('freeCash'))} ≥ ${fmtMoney2(out.monthlyAllIn)} → ${out.affordable ? 'yes' : 'no'}`,
              dscr != null ? `DSCR ≈ free_cash ÷ payment = ${dscr.toFixed(2)}x` : '',
            ]
              .filter(Boolean)
              .join('\n')}
            assumptions="Free cash = this statement period’s money in − money out. Loan amount, APR, and term come from your lender quote — not from statements. One month’s FCF is a planning hint, not underwriting."
            tip={
              out.affordable
                ? 'Tip: Leave headroom — one good month doesn’t guarantee every month.'
                : 'Tip: Payment exceeds this month’s free cash — lower amount/term or grow cash flow first.'
            }
          />
        );
      }
      case 'pricing-margin': {
        if (!v.cost || !v.margin) {
          return (
            <p className={styles.empty}>
              Enter unit cost and target margin % on selling price. Platform/processing/tax fees are
              optional.
            </p>
          );
        }
        const out = calcTargetPrice(num('cost'), num('margin'), {
          platformFeePct: o('platformFee'),
          processingFeePct: o('processingFee'),
          taxPct: o('tax'),
        });
        if (!out) {
          return (
            <p className={styles.empty}>
              Need cost &gt; 0 and target margin between 0 and 100% (after fees must leave room for cost).
            </p>
          );
        }
        return (
          <ResultBlock
            title="Target selling price"
            main={fmtMoney2(out.price)}
            sub={`Markup ${fmtPct(out.markupPct)} on cost${out.feePctTotal > 0 ? ` · fees/tax ${fmtPct(out.feePctTotal)} of price` : ''}.`}
            formula={[
              'price = cost ÷ (1 − margin% − fee%)',
              `price = ${fmtMoney2(num('cost'))} ÷ (1 − ${(num('margin') / 100).toFixed(4)}${out.feePctTotal > 0 ? ` − ${(out.feePctTotal / 100).toFixed(4)}` : ''})`,
              `= ${fmtMoney2(out.price)}`,
              `markup_% = (price − cost) ÷ cost × 100 = ${out.markupPct.toFixed(2)}%`,
            ].join('\n')}
            assumptions="Cost and target margin are your pricing inputs — not from statements. Optional fee % are taken off the selling price before margin."
            tip={
              out.markupPct > num('margin') * 1.5
                ? 'Tip: Markup % looks much higher than margin % — that’s normal; margin is on price, markup is on cost.'
                : 'Tip: Margin is on selling price; markup is on cost — don’t mix them when setting prices.'
            }
          />
        );
      }
      case 'mca-apr': {
        if (!v.advance || !v.factor || !v.months) {
          return (
            <p className={styles.empty}>
              Enter the MCA advance amount, factor rate, and term (months) from your quote. Origination
              and late penalties are optional. Bank statements don’t include MCA terms.
            </p>
          );
        }
        const out = calcMcaApr(num('advance'), num('factor'), num('months'), {
          originationFee: o('origination'),
          latePenalties: o('latePenalties'),
        });
        if (!out) {
          return (
            <p className={styles.empty}>
              Need advance &gt; 0, factor rate &gt; 1, and term months &gt; 0.
            </p>
          );
        }
        return (
          <ResultBlock
            title="Estimated MCA APR"
            main={fmtPct(out.aprPct)}
            sub={`Payback ${fmtMoney(out.payback)} · finance cost ${fmtMoney(out.cost)}${out.extraFees > 0 ? ` (incl. ${fmtMoney(out.extraFees)} fees)` : ''} · simple annualized ≈ ${fmtPct(out.simpleAprPct)}.`}
            risk={evaluateRisk('mca-apr', out.aprPct)}
            formula={[
              'payback = advance × factor',
              `payback = ${fmtMoney2(num('advance'))} × ${num('factor')} = ${fmtMoney2(out.payback)}`,
              'APR ≈ (2 × 12 × finance_charge) ÷ (advance × (n + 1))',
              `APR ≈ ${out.aprPct.toFixed(2)}%`,
            ].join('\n')}
            assumptions="Advance, factor, and term come from your MCA quote — not from statements. APR uses a Rule-of-78 style estimate common for factor products; not a Truth-in-Lending disclosure."
            tip={
              out.aprPct > 50
                ? 'Tip: APR over 50% is expensive financing — compare to a term loan or LOC if you can qualify.'
                : 'Tip: Compare this APR to other credit options before signing.'
            }
          />
        );
      }
      case 'sba-eligibility': {
        if (!v.revenue || !v.years || !v.requested) {
          return (
            <p className={styles.empty}>
              Annual revenue prefills from your statement (this month × 12) when available. Enter years
              in business and the loan amount you want; fees are optional.
            </p>
          );
        }
        const out = calcSbaEstimate(num('revenue'), num('years'), num('requested'), {
          packingFees: o('packing'),
          guaranteeFees: o('guarantee'),
          processingCharges: o('processing'),
        });
        if (!out) {
          return (
            <p className={styles.empty}>
              Need annual revenue &gt; 0, years ≥ 0, and requested amount &gt; 0.
            </p>
          );
        }
        return (
          <ResultBlock
            title={out.likelyEligible ? 'In the ballpark (planning hint)' : 'May be limited'}
            main={fmtMoney(out.estimatedMax)}
            sub={`Planning max ≈ ${fmtMoney(out.estimatedMax)} · request ${fmtMoney(out.allInRequest)}${out.feeTotal > 0 ? ` (incl. ${fmtMoney(out.feeTotal)} fees)` : ''}. ${out.note}`}
            formula={[
              'estimated_max ≈ min(annual_revenue × 50%, $5M statutory 7(a) cap)',
              `estimated_max = ${fmtMoney2(out.estimatedMax)}`,
              `likely_eligible ≈ years ≥ 2 && revenue ≥ $100k && request ≤ max → ${out.likelyEligible ? 'yes' : 'no'}`,
            ].join('\n')}
            assumptions="Revenue may be annualized from this statement period (× 12). Years in business and requested amount are your inputs. This is a size/planning hint — not an SBA eligibility determination. DSCR risk gauge appears on Loan Affordability when you enter a payment."
            tip={
              out.likelyEligible
                ? 'Tip: Ballpark only — confirm use of proceeds, credit, and lender rules on SBA.gov.'
                : 'Tip: Size or tenure may be tight — verify current 7(a) rules before applying.'
            }
          />
        );
      }
      case 'inventory-turnover': {
        if (!v.cogs || !v.inventory) {
          return (
            <p className={styles.empty}>
              Enter annual COGS and average inventory from your books. Bank/POS statements usually don’t
              include inventory balances. Holding-cost fields are optional.
            </p>
          );
        }
        const out = calcInventoryTurnover(num('cogs'), num('inventory'), {
          carryingCost: o('carrying'),
          carryingCostPct: o('carryingPct'),
          storageFees: o('storage'),
          spoilage: o('spoilage'),
          financingCharges: o('financing'),
        });
        if (!out) {
          return <p className={styles.empty}>Need COGS &gt; 0 and average inventory &gt; 0.</p>;
        }
        return (
          <ResultBlock
            title="Inventory turns"
            main={`${out.turns.toFixed(1)}× / year`}
            sub={`≈ ${out.daysOnHand.toFixed(0)} days on hand${out.holdingCost > 0 ? ` · holding cost ${fmtMoney(out.holdingCost)}` : ''}.`}
            risk={evaluateRisk('inventory-turnover', out.turns)}
            formula={[
              'turns = COGS ÷ average_inventory',
              `turns = ${fmtMoney2(num('cogs'))} ÷ ${fmtMoney2(num('inventory'))} = ${out.turns.toFixed(2)}`,
              `days_on_hand = 365 ÷ turns = ${out.daysOnHand.toFixed(1)}`,
            ].join('\n')}
            assumptions="COGS and average inventory are manual bookkeeping inputs — not invented from statements. Optional carrying %, storage, spoilage, and financing add into holding cost."
            tip={
              out.daysOnHand > 90
                ? 'Tip: Over ~90 days on hand can tie up cash — review slow movers.'
                : 'Tip: Healthy turns free cash; watch spoilage and storage if holding cost rises.'
            }
          />
        );
      }
      default:
        return null;
    }
  }, [active, values, result, analysis]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
  };

  const fields = (() => {
    if (!active) return null;
    const v = values;
    switch (active.id) {
      case 'cash-runway':
        return (
          <>
            <p className={styles.empty} style={{ gridColumn: '1 / -1', marginBottom: 4 }}>
              Cash = bank ending balance. Monthly burn is derived from Overview runway days when
              available: burn = cash × (365.25 ÷ 12) ÷ days.
            </p>
            <Field label="Cash on hand ($)" name="cash" value={v.cash ?? ''} onChange={setField} />
            <Field
              label="Monthly burn ($)"
              name="burn"
              value={v.burn ?? ''}
              onChange={setField}
            />
          </>
        );
      case 'cash-flow-forecast':
        return (
          <>
            <Field label="Starting cash ($)" name="cash" value={v.cash ?? ''} onChange={setField} />
            <Field label="Avg monthly inflow ($)" name="inflow" value={v.inflow ?? ''} onChange={setField} />
            <Field label="Avg monthly outflow ($)" name="outflow" value={v.outflow ?? ''} onChange={setField} />
          </>
        );
      case 'weekly-cash-flow':
        return (
          <>
            <Field label="Monthly revenue target ($)" name="target" value={v.target ?? ''} onChange={setField} />
            <Field label="Week number (1–5)" name="week" value={v.week ?? ''} onChange={setField} />
            <Field
              label="Revenue so far this month ($)"
              name="soFar"
              value={v.soFar ?? ''}
              onChange={setField}
              full
            />
          </>
        );
      case 'net-margin':
        return (
          <>
            <Field label="Revenue ($)" name="revenue" value={v.revenue ?? ''} onChange={setField} />
            <Field label="COGS ($)" name="cogs" value={v.cogs ?? ''} onChange={setField} />
            <Field label="Operating expenses ($)" name="opex" value={v.opex ?? ''} onChange={setField} />
          </>
        );
      case 'gross-margin':
        return (
          <>
            <p className={styles.empty} style={{ gridColumn: '1 / -1', marginBottom: 4 }}>
              Revenue, fees, and returns from your statement. Enter COGS only if you know it.
            </p>
            <Field label="Revenue ($)" name="revenue" value={v.revenue ?? ''} onChange={setField} />
            <Field label="COGS ($)" name="cogs" value={v.cogs ?? ''} onChange={setField} />
            <Field
              label="Processing fees ($)"
              name="processingFees"
              value={v.processingFees ?? ''}
              onChange={setField}
            />
            <Field label="Returns / refunds ($)" name="returns" value={v.returns ?? ''} onChange={setField} />
          </>
        );
      case 'break-even':
        return (
          <>
            <p className={styles.empty} style={{ gridColumn: '1 / -1', marginBottom: 4 }}>
              Fixed costs ≈ period money out. Margin ≈ contribution after statement fees/refunds when
              COGS is unknown.
            </p>
            <Field label="Monthly fixed costs ($)" name="fixed" value={v.fixed ?? ''} onChange={setField} />
            <Field
              label="Contribution margin (%)"
              name="margin"
              value={v.margin ?? ''}
              onChange={setField}
            />
          </>
        );
      case 'processor-compare': {
        const stmtRates = statementProcessorRates(result);
        return (
          <>
            <p className={styles.empty} style={{ gridColumn: '1 / -1', marginBottom: 4 }}>
              Estimates yearly processing fees from <strong>your</strong> statement rates on the same
              card volume (this month’s sales × 12).
            </p>
            <Field
              label="Annual card volume ($)"
              name="volume"
              value={v.volume ?? ''}
              onChange={setField}
              full
            />
            {stmtRates.length === 0 ? (
              <p className={styles.empty}>
                No fee % found on this statement’s processors — fields appear only for what you
                uploaded.
              </p>
            ) : (
              stmtRates.map((r) => (
                <Field
                  key={r.key}
                  label={`${r.label} fee (%) — from your statement`}
                  name={r.key}
                  value={v[r.key] ?? ''}
                  onChange={setField}
                />
              ))
            )}
          </>
        );
      }
      case 'payroll-pct-revenue':
        return (
          <>
            <Field label="Payroll ($)" name="payroll" value={v.payroll ?? ''} onChange={setField} />
            <Field label="Revenue ($)" name="revenue" value={v.revenue ?? ''} onChange={setField} />
          </>
        );
      case 'hiring-affordability':
        return (
          <>
            <p className={styles.empty} style={{ gridColumn: '1 / -1', marginBottom: 4 }}>
              Cash and burn match Cash Runway from your statements. Enter the hire’s monthly all-in
              salary.
            </p>
            <Field label="Cash on hand ($)" name="cash" value={v.cash ?? ''} onChange={setField} />
            <Field label="Monthly burn ($)" name="burn" value={v.burn ?? ''} onChange={setField} />
            <Field
              label="New hire monthly salary all-in ($)"
              name="salary"
              value={v.salary ?? ''}
              onChange={setField}
              full
            />
            <Field
              label="Contribution margin (%) — optional"
              name="contributionMargin"
              value={v.contributionMargin ?? ''}
              onChange={setField}
            />
          </>
        );
      case 'roi':
        return (
          <>
            <p className={styles.empty} style={{ gridColumn: '1 / -1', marginBottom: 4 }}>
              Period cash ROI from your statement: money out = investment, money in = return.
            </p>
            <Field
              label="Investment — money out ($)"
              name="investment"
              value={v.investment ?? ''}
              onChange={setField}
            />
            <Field
              label="Return — money in ($)"
              name="returnAmount"
              value={v.returnAmount ?? ''}
              onChange={setField}
            />
            <Field
              label="Months in this period"
              name="monthsHeld"
              value={v.monthsHeld ?? ''}
              onChange={setField}
            />
          </>
        );
      case 'buy-vs-lease':
        return (
          <>
            <p className={styles.empty} style={{ gridColumn: '1 / -1', marginBottom: 4 }}>
              From your equipment quote. Cash on hand is from your statement (affordability context
              only).
            </p>
            <Field label="Purchase price ($)" name="price" value={v.price ?? ''} onChange={setField} />
            <Field label="Lease term (months)" name="months" value={v.months ?? ''} onChange={setField} />
            <Field
              label="Monthly lease payment ($)"
              name="lease"
              value={v.lease ?? ''}
              onChange={setField}
            />
            <Field
              label="Cash on hand — from statement ($)"
              name="cashAvailable"
              value={v.cashAvailable ?? ''}
              onChange={setField}
            />
            <Field label="Buy tax ($)" name="buyTax" value={v.buyTax ?? ''} onChange={setField} />
            <Field
              label="Buy interest / financing ($)"
              name="buyInterest"
              value={v.buyInterest ?? ''}
              onChange={setField}
            />
            <Field
              label="Buy maintenance over term ($)"
              name="buyMaintenance"
              value={v.buyMaintenance ?? ''}
              onChange={setField}
            />
            <Field
              label="Residual / resale value ($)"
              name="residual"
              value={v.residual ?? ''}
              onChange={setField}
            />
            <Field label="Lease tax / fees ($)" name="leaseTax" value={v.leaseTax ?? ''} onChange={setField} />
            <Field
              label="Lease maintenance over term ($)"
              name="leaseMaintenance"
              value={v.leaseMaintenance ?? ''}
              onChange={setField}
            />
            <Field
              label="Early termination penalty ($)"
              name="earlyTermination"
              value={v.earlyTermination ?? ''}
              onChange={setField}
            />
            <Field
              label="Discount rate % (NPV) — optional"
              name="discountRate"
              value={v.discountRate ?? ''}
              onChange={setField}
            />
          </>
        );
      case 'late-payment-cost':
        return (
          <>
            <p className={styles.empty} style={{ gridColumn: '1 / -1', marginBottom: 4 }}>
              From your invoice or AR aging — not on bank/POS statements. Cost of capital is your
              annual % (e.g. line-of-credit rate).
            </p>
            <Field
              label="Invoice amount overdue ($)"
              name="amount"
              value={v.amount ?? ''}
              onChange={setField}
            />
            <Field label="Days late" name="daysLate" value={v.daysLate ?? ''} onChange={setField} />
            <Field
              label="Annual cost of capital (%)"
              name="costOfCapital"
              value={v.costOfCapital ?? ''}
              onChange={setField}
            />
            <Field label="Late fees ($)" name="lateFees" value={v.lateFees ?? ''} onChange={setField} />
            <Field
              label="Collection fees ($)"
              name="collectionFees"
              value={v.collectionFees ?? ''}
              onChange={setField}
            />
            <Field
              label="Legal / other costs ($)"
              name="legalCosts"
              value={v.legalCosts ?? ''}
              onChange={setField}
            />
          </>
        );
      case 'employee-true-cost':
        return (
          <>
            <p className={styles.empty} style={{ gridColumn: '1 / -1', marginBottom: 4 }}>
              Per-employee offer math — not from statements. Burden covers employer taxes and benefits
              on top of salary (US SMBs often use 25–40%; leave blank until you know yours).
            </p>
            <Field
              label="Annual base salary ($)"
              name="salary"
              value={v.salary ?? ''}
              onChange={setField}
            />
            <Field
              label="Employer burden (%)"
              name="burden"
              value={v.burden ?? ''}
              onChange={setField}
            />
            <Field
              label="Signing bonus ($)"
              name="signingBonus"
              value={v.signingBonus ?? ''}
              onChange={setField}
            />
            <Field
              label="Severance / other one-time ($)"
              name="severance"
              value={v.severance ?? ''}
              onChange={setField}
            />
          </>
        );
      case 'loan-affordability':
        return (
          <>
            <p className={styles.empty} style={{ gridColumn: '1 / -1', marginBottom: 4 }}>
              Free cash prefills from your statement (money in − money out). Enter the loan quote for
              amount, APR, and term.
            </p>
            <Field
              label="Loan amount / principal ($)"
              name="principal"
              value={v.principal ?? ''}
              onChange={setField}
            />
            <Field label="APR (%)" name="rate" value={v.rate ?? ''} onChange={setField} />
            <Field label="Term (months)" name="months" value={v.months ?? ''} onChange={setField} />
            <Field
              label="Monthly free cash — from statement ($)"
              name="freeCash"
              value={v.freeCash ?? ''}
              onChange={setField}
            />
            <Field
              label="Origination fee ($)"
              name="origination"
              value={v.origination ?? ''}
              onChange={setField}
            />
            <Field
              label="Monthly insurance ($)"
              name="insurance"
              value={v.insurance ?? ''}
              onChange={setField}
            />
            <Field
              label="Prepayment penalty ($)"
              name="prepay"
              value={v.prepay ?? ''}
              onChange={setField}
            />
          </>
        );
      case 'pricing-margin':
        return (
          <>
            <p className={styles.empty} style={{ gridColumn: '1 / -1', marginBottom: 4 }}>
              Pricing what-if — not from statements. Target margin is on selling price; fees/tax % are
              also taken from price.
            </p>
            <Field label="Unit cost ($)" name="cost" value={v.cost ?? ''} onChange={setField} />
            <Field
              label="Target margin (%)"
              name="margin"
              value={v.margin ?? ''}
              onChange={setField}
            />
            <Field
              label="Platform fee (%)"
              name="platformFee"
              value={v.platformFee ?? ''}
              onChange={setField}
            />
            <Field
              label="Processing fee (%)"
              name="processingFee"
              value={v.processingFee ?? ''}
              onChange={setField}
            />
            <Field label="Sales tax (%)" name="tax" value={v.tax ?? ''} onChange={setField} />
          </>
        );
      case 'mca-apr':
        return (
          <>
            <p className={styles.empty} style={{ gridColumn: '1 / -1', marginBottom: 4 }}>
              From your MCA quote — not on bank statements. Factor rate is typically like 1.25–1.5
              (not a percent).
            </p>
            <Field
              label="Advance amount ($)"
              name="advance"
              value={v.advance ?? ''}
              onChange={setField}
            />
            <Field label="Factor rate" name="factor" value={v.factor ?? ''} onChange={setField} />
            <Field label="Term (months)" name="months" value={v.months ?? ''} onChange={setField} />
            <Field
              label="Origination fee ($)"
              name="origination"
              value={v.origination ?? ''}
              onChange={setField}
            />
            <Field
              label="Late / other penalties ($)"
              name="latePenalties"
              value={v.latePenalties ?? ''}
              onChange={setField}
            />
          </>
        );
      case 'sba-eligibility':
        return (
          <>
            <p className={styles.empty} style={{ gridColumn: '1 / -1', marginBottom: 4 }}>
              Annual revenue prefills from this statement month × 12 when available. Years in business
              and requested amount come from you.
            </p>
            <Field
              label="Annual revenue ($)"
              name="revenue"
              value={v.revenue ?? ''}
              onChange={setField}
            />
            <Field
              label="Years in business"
              name="years"
              value={v.years ?? ''}
              onChange={setField}
            />
            <Field
              label="Requested loan amount ($)"
              name="requested"
              value={v.requested ?? ''}
              onChange={setField}
            />
            <Field
              label="Packaging fees ($)"
              name="packing"
              value={v.packing ?? ''}
              onChange={setField}
            />
            <Field
              label="Guarantee fees ($)"
              name="guarantee"
              value={v.guarantee ?? ''}
              onChange={setField}
            />
            <Field
              label="Processing charges ($)"
              name="processing"
              value={v.processing ?? ''}
              onChange={setField}
            />
          </>
        );
      case 'inventory-turnover':
        return (
          <>
            <p className={styles.empty} style={{ gridColumn: '1 / -1', marginBottom: 4 }}>
              Manual COGS and average inventory from your books — usually not on bank/POS statements.
            </p>
            <Field label="Annual COGS ($)" name="cogs" value={v.cogs ?? ''} onChange={setField} />
            <Field
              label="Average inventory ($)"
              name="inventory"
              value={v.inventory ?? ''}
              onChange={setField}
            />
            <Field
              label="Carrying cost ($)"
              name="carrying"
              value={v.carrying ?? ''}
              onChange={setField}
            />
            <Field
              label="Carrying cost (% of inventory)"
              name="carryingPct"
              value={v.carryingPct ?? ''}
              onChange={setField}
            />
            <Field
              label="Storage fees ($)"
              name="storage"
              value={v.storage ?? ''}
              onChange={setField}
            />
            <Field label="Spoilage ($)" name="spoilage" value={v.spoilage ?? ''} onChange={setField} />
            <Field
              label="Financing charges ($)"
              name="financing"
              value={v.financing ?? ''}
              onChange={setField}
            />
          </>
        );
      default:
        return null;
    }
  })();

  const loadingPanel = (title: ReactNode, detail: string) => (
    <div className={styles.letterScope}>
      <div className={styles.main}>
        <SectionHeader periodMeta="Business Health" title={title} />
        <div className="wrap" style={{ padding: '12px 0 28px' }}>
          <div className={styles.loadStatus} role="status" aria-live="polite">
            <Spinner label={detail} size="sm" />
            <p className={styles.loadWhy}>
              Fetching your saved statement month from the server — this can take a few seconds on a
              cold start.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // First open only — don’t blank the page once a month is already in memory.
  if ((!historyReady || hydrating) && !analysis) {
    return loadingPanel(
      <>
        Loading your <em>statements…</em>
      </>,
      loadStatus ??
        (hydrating
          ? 'Opening your saved statement…'
          : 'Loading your saved months from your account…'),
    );
  }

  if (!hasLiveAnalysis && savedCount === 0) {
    return (
      <div className={styles.letterScope}>
        <div className={styles.main}>
          <DashboardEmptyState historyReady={historyReady} loadingHintClassName={styles.emptyHint} />
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className={styles.letterScope}>
        <div className={styles.main}>
          <SectionHeader
            periodMeta="Business Health"
            title={
              <>
                Numbers from <em>your statements.</em>
              </>
            }
          />
          <div className="wrap" style={{ padding: '12px 0 28px' }}>
            {hydrateError ? (
              <p className={styles.emptyHint}>{hydrateError}</p>
            ) : loadStatus || hydrating || savedCount > 0 ? (
              <div className={styles.loadStatus} role="status" aria-live="polite">
                <Spinner
                  label={
                    loadStatus ??
                    (savedCount > 0
                      ? 'Opening your latest statement month…'
                      : 'Loading your statements…')
                  }
                  size="sm"
                />
                <p className={styles.loadWhy}>
                  Using the month name from your uploaded statement — same as AT Letter.
                </p>
              </div>
            ) : (
              <p className={styles.emptyHint}>
                Upload statements once, then calculators fill from that data.
              </p>
            )}
            {letterViewBar}
            {showViewFilters && viewMeta ? <p className={styles.emptyHint}>{viewMeta}</p> : null}
            {monthsOnFileChip}
          </div>
        </div>
      </div>
    );
  }

  const scoreFrac = Math.max(0, Math.min(1, (healthOverview?.score ?? 0) / 100));
  const gaugeR = 88;
  const gaugeCx = 110;
  const gaugeCy = 100;
  const gaugeLen = Math.PI * gaugeR;

  return (
    <div className={styles.letterScope}>
      <SectionHeader
        periodMeta={analysis.period_label ? analysis.period_label.toUpperCase() : 'Business Health'}
        title={
          <>
            Business <em>Health.</em>
          </>
        }
      />
      <div className={styles.main}>
        <div className="wrap">
          <div className={styles.page}>
            <div className={styles.scrollViewport}>
              {letterViewBar}
              {showViewFilters && viewMeta ? <p className={styles.emptyHint}>{viewMeta}</p> : null}
              {showGuidePanels ? monthsOnFileChip : null}
              {hydrating && analysis && loadStatus ? (
                <div className={styles.loadStatus} role="status" aria-live="polite">
                  <Spinner label={loadStatus} size="sm" />
                </div>
              ) : null}

              {!monthOnly ? (
                rollingLoading && !performance ? (
                  <div className={styles.loadStatus} role="status" aria-live="polite">
                    <Spinner
                      label={loadStatus ?? 'Opening your latest months for the trend view…'}
                      size="sm"
                    />
                    <p className={styles.loadWhy}>
                      First time only — months are cached after this, so the next click opens
                      instantly.
                    </p>
                  </div>
                ) : rollingError ? (
                  <p className={styles.emptyHint}>{rollingError}</p>
                ) : performance ? (
                  <CalculatorPerformancePanel
                    performance={performance}
                    onOpenCalculator={(id) => void openFromPerformance(id)}
                  />
                ) : (
                  <p className={styles.emptyHint}>
                    Upload at least one statement month to see calculator performance.
                  </p>
                )
              ) : (
                <>
              {showGuidePanels ? (
              <div className={`${styles.directions} ${styles.animIn}`}>
                <div className={styles.directionsEyebrow}>How to read this</div>
                <p className={styles.prose}>
                  Every calculator runs on this statement&apos;s numbers and is scored against
                  AskTill defaults. Use <b>Custom risk</b> on a card or in the panel to set your own
                  cutoffs (e.g. runway At risk at 45 days). Bars show:{' '}
                  <span className={styles.legendKey}>
                    <i className={styles.dotRed} />
                    <b>At risk</b>
                  </span>
                  <span className={styles.legendKey}>
                    <i className={styles.dotAmber} />
                    <b>Watch</b>
                  </span>
                  <span className={styles.legendKey}>
                    <i className={styles.dotGreen} />
                    <b>Healthy</b>
                  </span>
                </p>
              </div>
              ) : null}

              {healthOverview ? (
                <>
                  <div className={`${styles.scoreboard} ${styles.animIn} ${styles.animDelay1}`}>
                    <div className={styles.overall}>
                      <button
                        type="button"
                        className={styles.guideToggle}
                        aria-expanded={showGuidePanels}
                        aria-label={
                          showGuidePanels
                            ? 'Hide months on file and how to read this'
                            : 'Show months on file and how to read this'
                        }
                        title={showGuidePanels ? 'Hide guide' : 'Show guide'}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowGuidePanels((v) => !v);
                        }}
                      >
                        {showGuidePanels ? (
                          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                            <path
                              fill="currentColor"
                              d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"
                            />
                            <path
                              fill="currentColor"
                              d="M3.3 3.3 20.7 20.7l-1.4 1.4L1.9 4.7z"
                            />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                            <path
                              fill="currentColor"
                              d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"
                            />
                          </svg>
                        )}
                      </button>
                      <div className={styles.gaugeWrap}>
                        <svg viewBox="0 0 220 118" width="220" className={styles.gaugeSvg} aria-hidden>
                          <path
                            d={`M ${gaugeCx - gaugeR} ${gaugeCy} A ${gaugeR} ${gaugeR} 0 0 1 ${gaugeCx + gaugeR} ${gaugeCy}`}
                            fill="none"
                            stroke="rgba(255,255,255,0.22)"
                            strokeWidth="14"
                            strokeLinecap="round"
                          />
                          <path
                            className={styles.gaugeProgress}
                            d={`M ${gaugeCx - gaugeR} ${gaugeCy} A ${gaugeR} ${gaugeR} 0 0 1 ${gaugeCx + gaugeR} ${gaugeCy}`}
                            fill="none"
                            stroke="#fff"
                            strokeWidth="14"
                            strokeLinecap="round"
                            strokeDasharray={`${scoreFrac * gaugeLen} ${gaugeLen}`}
                            style={
                              {
                                '--gauge-len': gaugeLen,
                                '--gauge-drawn': scoreFrac * gaugeLen,
                              } as CSSProperties
                            }
                          />
                        </svg>
                        <div className={styles.gaugeScoreBlock}>
                          <div className={styles.gaugeScore}>
                            {healthOverview.score}
                            <span className={styles.gaugeOf}> / 100</span>
                          </div>
                          <div className={styles.gaugeBand}>{healthOverview.bandLabel}</div>
                        </div>
                      </div>
                      <div className={styles.ovRight}>
                          <h2 className={styles.ovTitle}>Business Health</h2>
                        <p className={styles.ovMeta}>
                          {healthOverview.periodLabel} · {healthOverview.scored} of{' '}
                          {healthOverview.total} scored
                        </p>
                      </div>
                    </div>

                    <div className={styles.counts}>
                      <div className={`${styles.count} ${styles.countGreen}`}>
                        <span className={`${styles.countIcon} ${styles.countIconGreen}`} aria-hidden>
                          <i className="ti ti-circle-check" />
                        </span>
                        <div className={styles.countN}>{healthOverview.healthy}</div>
                        <div className={styles.countL}>
                          <b>Healthy</b>
                        </div>
                      </div>
                      <div className={`${styles.count} ${styles.countAmber}`}>
                        <span className={`${styles.countIcon} ${styles.countIconAmber}`} aria-hidden>
                          <i className="ti ti-eye" />
                        </span>
                        <div className={styles.countN}>{healthOverview.watch}</div>
                        <div className={styles.countL}>
                          <b>Watch</b>
                        </div>
                      </div>
                      <div className={`${styles.count} ${styles.countRed}`}>
                        <span className={`${styles.countIcon} ${styles.countIconRed}`} aria-hidden>
                          <i className="ti ti-alert-triangle" />
                        </span>
                        <div className={styles.countN}>{healthOverview.atRisk}</div>
                        <div className={styles.countL}>
                          <b>At risk</b>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className={`${styles.ovSummary} ${styles.prose} ${styles.animIn}`}>{healthOverview.summary}</p>
                </>
              ) : null}

              <div className={`${styles.workbench} ${active ? styles.workbenchSplit : ''}`}>
                <div className={styles.groupsPane}>
                  {healthOverview?.groups.map((group, gi) => {
                    const tallies = {
                      green: group.rows.filter((r) => r.band === 'green').length,
                      amber: group.rows.filter((r) => r.band === 'amber').length,
                      red: group.rows.filter((r) => r.band === 'red').length,
                    };
                    return (
                      <section key={group.id} className={styles.cat}>
                        <div className={styles.catHd}>
                          <h3>
                            <span className={styles.sectionNum}>{gi + 1}</span>
                            {group.title}
                            <span className={styles.cnum}>{group.rows.length}</span>
                          </h3>
                          <div className={styles.catTally}>
                            <span>
                              <i className={styles.dotGreen} />
                              {tallies.green}
                            </span>
                            <span>
                              <i className={styles.dotAmber} />
                              {tallies.amber}
                            </span>
                            <span>
                              <i className={styles.dotRed} />
                              {tallies.red}
                            </span>
                          </div>
                        </div>
                        <div className={styles.healthGrid}>
                          {group.rows.map((row) => (
                            <div
                              key={row.id}
                              role="button"
                              tabIndex={0}
                              className={`${styles.calcRow} ${styles[`band_${row.band}`]} ${
                                active?.id === row.id ? styles.calcRowActive : ''
                              }`}
                              onClick={() => openCalculator(row.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  openCalculator(row.id);
                                }
                              }}
                            >
                              <div className={styles.calcInfo}>
                                <span
                                  className={`${styles.calcIcon} ${styles[`icon_${row.band}`]}`}
                                  aria-hidden
                                >
                                  <i className={`ti ${healthRowIcon(row.id)}`} />
                                </span>
                                <div className={styles.calcText}>
                                  <div className={styles.calcName}>{row.meta.name}</div>
                                  <div className={styles.calcQ}>{row.meta.question}</div>
                                </div>
                              </div>
                              <div className={styles.calcRead}>
                                <div className={styles.reading}>
                                  <span className={styles.readingV}>{row.displayMain}</span>
                                  {row.displayUnit ? (
                                    <span className={styles.readingU}>{row.displayUnit}</span>
                                  ) : null}
                                </div>
                                {row.metricLabel ? (
                                  <div className={styles.metricLab}>{row.metricLabel}</div>
                                ) : null}
                              </div>
                              <div className={styles.calcMeter}>
                                {row.risk ? (
                                  <RiskGauge reading={row.risk} compact />
                                ) : (
                                  <p className={styles.infoNote}>
                                    {row.note ?? 'Open to enter inputs.'}
                                  </p>
                                )}
                              </div>
                              <div className={styles.cPill}>
                                {row.risk ? (
                                  <span
                                    className={`${styles.statusWord} ${styles[`statusWord_${row.risk.level}`]}`}
                                  >
                                    {row.risk.level === 'low' ? 'Good' : row.risk.levelLabel}
                                  </span>
                                ) : (
                                  <span className={`${styles.statusWord} ${styles.statusWord_na}`}>
                                    —
                                  </span>
                                )}
                                <span className={`${styles.pill} ${styles[`pill_${row.band}`]}`}>
                                  {row.pillLabel}
                                </span>
                                {row.risk ? (
                                  <CustomRiskControl calculatorId={row.id} compact />
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>

                {active ? (
                  <section className={styles.panel} aria-live="polite">
                    <div className={styles.panelTop}>
                      <div>
                        <h2 className={styles.panelTitle}>{active.name}</h2>
                        <p className={styles.panelQ}>{active.question}</p>
                        <div className={styles.panelRiskRow}>
                          <CustomRiskControl calculatorId={active.id} />
                        </div>
                      </div>
                      <button type="button" className={styles.panelClose} onClick={closeCalculator}>
                        Close
                      </button>
                    </div>
                    <form className={styles.form} onSubmit={onSubmit}>
                      {fields}
                    </form>
                    {resultBlock}
                  </section>
                ) : null}
              </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
