import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { AnalyzeResult } from '../lib/analyzeResponse';
import { getAnalyzeAnalysis } from '../lib/analyzeResponse';
import { fetchSavedReport, type SavedReportSummaryApi } from '../lib/api';
import { comparePeriodKeys, periodKeyFromLabel } from '../lib/atLetterStatement';
import {
  getCachedCalculatorReport,
  getCachedRollingWindow,
  putCachedCalculatorReport,
  putCachedRollingWindow,
  rollingWindowKey,
} from '../lib/calculatorRollingCache';

const HOVER_VIEW_MS = 120;
export const ROLLING_VIEW = 'rolling' as const;

export type BriefViewMode = 'rolling' | 'month';

type Args = {
  result: AnalyzeResult | null | undefined;
  savedReports: SavedReportSummaryApi[];
  historyReady: boolean;
  canSelectMonth: boolean;
};

function sortNewestFirst(reports: SavedReportSummaryApi[]): SavedReportSummaryApi[] {
  return [...reports].sort((a, b) => {
    const byPeriod = comparePeriodKeys(a.period_key, b.period_key);
    if (byPeriod !== 0) return byPeriod;
    return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
  });
}

function reportPeriodKey(row: SavedReportSummaryApi): string {
  return (row.period_key || periodKeyFromLabel(row.period_label) || '').trim();
}

/** History ending at the viewed month (newest first; no later uploads). */
function historyRowsForView(
  sortedNewestFirst: SavedReportSummaryApi[],
  result: AnalyzeResult | null | undefined,
  limit: number,
): SavedReportSummaryApi[] {
  const viewedId = result?.statement_id?.trim();
  const viewedKey =
    periodKeyFromLabel(getAnalyzeAnalysis(result)?.period_label) ||
    (viewedId
      ? reportPeriodKey(sortedNewestFirst.find((r) => r.statement_id === viewedId)!)
      : '');

  let eligible = sortedNewestFirst;
  if (viewedKey) {
    eligible = sortedNewestFirst.filter((row) => {
      const key = reportPeriodKey(row);
      if (!key) return row.statement_id === viewedId;
      return key <= viewedKey;
    });
  }

  const latest = eligible.slice(0, limit);
  if (
    viewedId &&
    !latest.some((r) => r.statement_id === viewedId) &&
    sortedNewestFirst.some((r) => r.statement_id === viewedId)
  ) {
    const viewed = sortedNewestFirst.find((r) => r.statement_id === viewedId)!;
    return [viewed, ...latest.filter((r) => r.statement_id !== viewedId)].slice(0, limit);
  }
  return latest;
}

/** AT Letter rolling: ≤3 months ending at the viewed month (no later uploads). */
function rollingRowsForView(
  sortedNewestFirst: SavedReportSummaryApi[],
  result: AnalyzeResult | null | undefined,
): SavedReportSummaryApi[] {
  return historyRowsForView(sortedNewestFirst, result, 3);
}

/** Immediate prior month on file (AT Letter month-only prior_month). */
function priorRowForView(
  sortedNewestFirst: SavedReportSummaryApi[],
  result: AnalyzeResult | null | undefined,
): SavedReportSummaryApi | null {
  const viewedId = result?.statement_id?.trim();
  const viewedKey =
    periodKeyFromLabel(getAnalyzeAnalysis(result)?.period_label) ||
    (viewedId
      ? reportPeriodKey(sortedNewestFirst.find((r) => r.statement_id === viewedId)!)
      : '');
  if (!viewedKey) return null;
  const older = sortedNewestFirst.filter((row) => {
    const key = reportPeriodKey(row);
    return Boolean(key && key < viewedKey);
  });
  return older[0] ?? null;
}

function toChronological(results: AnalyzeResult[]): AnalyzeResult[] {
  return [...results].reverse();
}

async function resolveSaved(
  row: SavedReportSummaryApi,
  result: AnalyzeResult | null | undefined,
  mem: Map<string, AnalyzeResult>,
): Promise<AnalyzeResult | null> {
  const id = row.statement_id;
  const hit =
    mem.get(id) ??
    (result?.statement_id === id && getAnalyzeAnalysis(result) ? result : null) ??
    getCachedCalculatorReport(id);
  if (hit && getAnalyzeAnalysis(hit)) {
    mem.set(id, hit);
    putCachedCalculatorReport(hit);
    return hit;
  }
  try {
    const { data } = await fetchSavedReport(id);
    if (!getAnalyzeAnalysis(data)) return null;
    mem.set(id, data);
    putCachedCalculatorReport(data);
    return data;
  } catch {
    return null;
  }
}

/**
 * AT Letter tag logic for Brief UI:
 * - Single-month: current statement (+ prior for MoM deltas)
 * - Last 3 months: ≤3 months ending at the viewed statement
 */
export function useRollingReports({
  result,
  savedReports,
  historyReady,
  canSelectMonth,
}: Args) {
  const [viewMode, setViewMode] = useState<BriefViewMode | null>(null);
  const [rollingResults, setRollingResults] = useState<AnalyzeResult[]>([]);
  const [trendResults, setTrendResults] = useState<AnalyzeResult[]>([]);
  const [priorResult, setPriorResult] = useState<AnalyzeResult | null>(null);
  const [rollingLoading, setRollingLoading] = useState(false);
  const [trendLoading, setTrendLoading] = useState(false);
  const [rollingError, setRollingError] = useState<string | null>(null);
  const [loadStatus, setLoadStatus] = useState<string | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rollingCacheRef = useRef<Map<string, AnalyzeResult>>(new Map());

  const sortedReports = useMemo(() => sortNewestFirst(savedReports), [savedReports]);

  const latestThree = useMemo(
    () => rollingRowsForView(sortedReports, result),
    [sortedReports, result],
  );

  const latestSix = useMemo(
    () => historyRowsForView(sortedReports, result, 6),
    [sortedReports, result],
  );

  const priorSummary = useMemo(
    () => priorRowForView(sortedReports, result),
    [sortedReports, result],
  );

  const activeView: BriefViewMode =
    viewMode ?? (canSelectMonth ? 'month' : ROLLING_VIEW);
  const monthOnly = activeView !== ROLLING_VIEW;
  const showViewFilters = Boolean(canSelectMonth || sortedReports.length > 0);

  const rollingKey = useMemo(
    () => rollingWindowKey(latestThree.map((r) => r.statement_id)),
    [latestThree],
  );

  const trendKey = useMemo(
    () => rollingWindowKey(latestSix.map((r) => r.statement_id)),
    [latestSix],
  );

  const clearHoverTimer = useCallback(() => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);

  const selectView = useCallback(
    (mode: BriefViewMode) => {
      if (mode === 'month' && !canSelectMonth) return;
      setViewMode(mode);
    },
    [canSelectMonth],
  );

  const selectViewOnHover = useCallback(
    (mode: BriefViewMode) => {
      clearHoverTimer();
      if (mode === 'month' && !canSelectMonth) return;
      const already =
        mode === ROLLING_VIEW ? activeView === ROLLING_VIEW : activeView !== ROLLING_VIEW;
      if (already) return;
      if (mode === ROLLING_VIEW) {
        const hit = rollingKey ? getCachedRollingWindow(rollingKey) : undefined;
        if (hit) {
          setRollingResults(toChronological(hit));
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
    [activeView, canSelectMonth, clearHoverTimer, rollingKey],
  );

  useEffect(() => () => clearHoverTimer(), [clearHoverTimer]);

  useEffect(() => {
    setViewMode(null);
  }, [result?.statement_id]);

  useEffect(() => {
    if (viewMode !== 'month') return;
    if (!canSelectMonth) setViewMode(null);
  }, [canSelectMonth, viewMode]);

  useEffect(() => {
    if (!result?.statement_id || !getAnalyzeAnalysis(result)) return;
    rollingCacheRef.current.set(result.statement_id, result);
    putCachedCalculatorReport(result);
  }, [result]);

  // Prefetch AT Letter "Last 3 months" window for the viewed statement.
  useEffect(() => {
    if (!historyReady || !latestThree.length) return;
    if (!rollingKey || getCachedRollingWindow(rollingKey)) return;

    let cancelled = false;
    void (async () => {
      const loaded: AnalyzeResult[] = [];
      for (const row of latestThree) {
        if (cancelled) return;
        const data = await resolveSaved(row, result, rollingCacheRef.current);
        if (data) loaded.push(data);
      }
      if (!cancelled && loaded.length === latestThree.length) {
        putCachedRollingWindow(rollingKey, loaded);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [historyReady, rollingKey, latestThree, result]);

  // Month-only prior (same idea as AT Letter prior_month).
  useEffect(() => {
    if (!historyReady || !priorSummary) {
      setPriorResult(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const data = await resolveSaved(priorSummary, result, rollingCacheRef.current);
      if (!cancelled) setPriorResult(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [historyReady, priorSummary, result?.statement_id]);

  // Always load ≤6 months for Trends charts (independent of month / Last 3 toggle).
  useEffect(() => {
    if (!historyReady) return;
    if (!latestSix.length) {
      setTrendResults(result && getAnalyzeAnalysis(result) ? [result] : []);
      setTrendLoading(false);
      return;
    }

    const windowHit = getCachedRollingWindow(trendKey);
    if (windowHit && windowHit.length === latestSix.length) {
      for (const r of windowHit) {
        if (r.statement_id) rollingCacheRef.current.set(r.statement_id, r);
      }
      setTrendResults(toChronological(windowHit));
      setTrendLoading(false);
      return;
    }

    const cached = latestSix
      .map(
        (row) =>
          rollingCacheRef.current.get(row.statement_id) ??
          getCachedCalculatorReport(row.statement_id),
      )
      .filter((r): r is AnalyzeResult => Boolean(r && getAnalyzeAnalysis(r)));
    if (cached.length === latestSix.length) {
      putCachedRollingWindow(trendKey, cached);
      setTrendResults(toChronological(cached));
      setTrendLoading(false);
      return;
    }

    if (cached.length > 0) setTrendResults(toChronological(cached));

    let cancelled = false;
    setTrendLoading(true);

    void (async () => {
      try {
        const loaded: AnalyzeResult[] = [];
        for (const row of latestSix) {
          if (cancelled) return;
          const data = await resolveSaved(row, result, rollingCacheRef.current);
          if (data) loaded.push(data);
        }
        if (cancelled) return;
        if (loaded.length) {
          putCachedRollingWindow(
            rollingWindowKey(loaded.map((r) => r.statement_id!)),
            loaded,
          );
          setTrendResults(toChronological(loaded));
        }
      } finally {
        if (!cancelled) setTrendLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [historyReady, latestSix, trendKey, result]);

  // Load rolling window when Last 3 months tag is active.
  useEffect(() => {
    if (monthOnly) return;
    if (!latestThree.length) {
      setRollingResults(result && getAnalyzeAnalysis(result) ? [result] : []);
      setLoadStatus(null);
      setRollingLoading(false);
      return;
    }

    const windowHit = getCachedRollingWindow(rollingKey);
    if (windowHit && windowHit.length === latestThree.length) {
      for (const r of windowHit) {
        if (r.statement_id) rollingCacheRef.current.set(r.statement_id, r);
      }
      setRollingResults(toChronological(windowHit));
      setRollingLoading(false);
      setRollingError(null);
      setLoadStatus(null);
      return;
    }

    const cached = latestThree
      .map(
        (row) =>
          rollingCacheRef.current.get(row.statement_id) ??
          getCachedCalculatorReport(row.statement_id),
      )
      .filter((r): r is AnalyzeResult => Boolean(r && getAnalyzeAnalysis(r)));
    if (cached.length === latestThree.length) {
      putCachedRollingWindow(rollingKey, cached);
      setRollingResults(toChronological(cached));
      setRollingLoading(false);
      setRollingError(null);
      setLoadStatus(null);
      return;
    }

    if (cached.length > 0) setRollingResults(toChronological(cached));

    let cancelled = false;
    setRollingLoading(true);
    setRollingError(null);
    const missing = latestThree.filter(
      (row) =>
        !(
          rollingCacheRef.current.has(row.statement_id) ||
          getCachedCalculatorReport(row.statement_id)
        ),
    );
    setLoadStatus(
      missing.length
        ? `Opening ${missing.length} saved month${missing.length === 1 ? '' : 's'}…`
        : 'Preparing comparison…',
    );

    void (async () => {
      try {
        const loaded: AnalyzeResult[] = [];
        for (let i = 0; i < latestThree.length; i += 1) {
          const row = latestThree[i]!;
          if (cancelled) return;
          const label = (row.period_label || row.period_key || 'statement').trim();
          setLoadStatus(`Opening ${label}… (${i + 1} of ${latestThree.length})`);
          const data = await resolveSaved(row, result, rollingCacheRef.current);
          if (data) loaded.push(data);
        }
        if (cancelled) return;
        if (loaded.length) {
          putCachedRollingWindow(
            rollingWindowKey(loaded.map((r) => r.statement_id!)),
            loaded,
          );
          setRollingResults(toChronological(loaded));
        }
        setRollingError(null);
      } catch {
        if (!cancelled) {
          setRollingError('Could not load months for comparison. Try again.');
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
  }, [monthOnly, latestThree, rollingKey, result]);

  return {
    activeView,
    monthOnly,
    showViewFilters,
    sortedReports,
    rollingResults,
    trendResults,
    priorResult,
    rollingLoading,
    trendLoading,
    rollingError,
    loadStatus,
    selectView,
    selectViewOnHover,
    clearHoverTimer,
    /** Months on file (capped at 3 like AT Letter history chips). */
    monthsOnFile: Math.min(Math.max(sortedReports.length, result ? 1 : 0), 3),
    monthsUploaded: sortedReports.length,
  };
}
