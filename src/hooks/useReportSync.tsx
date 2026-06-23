import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useAnalysis } from '../context/AnalysisContext';
import { useAuth } from '../context/AuthContext';
import { fetchReportHistory, fetchSavedReport, USER_LOGOUT_EVENT, type SavedReportSummaryApi } from '../lib/api';
import { clearUserAtLetterState, LETTER_UPDATED_EVENT } from '../lib/atLetterCache';
import { clearAtLetterHtmlCache, prefetchAtLetterHtml } from '../lib/atLetterHtmlCache';
import {
  comparePeriodKeys,
  periodKeyFromLabel,
  pickPrimarySavedReport,
  resolveAtLetterStatementId,
} from '../lib/atLetterStatement';
import { getAnalyzeAnalysis } from '../lib/analyzeResponse';
import type { AnalyzeResult } from '../lib/analyzeResponse';

const JUST_ANALYZED_KEY = 'asktill:just-analyzed';

export const REPORT_HISTORY_REFRESH_EVENT = 'asktill:report-history-refresh';

interface ReportSyncContextValue {
  historyReady: boolean;
  savedCount: number;
  primaryReport: SavedReportSummaryApi | null;
  savedReports: SavedReportSummaryApi[];
}

const ReportSyncContext = createContext<ReportSyncContextValue>({
  historyReady: false,
  savedCount: 0,
  primaryReport: null,
  savedReports: [],
});

/** Set after a successful analyze so we do not wipe in-memory results before DB history lists. */
export function markJustAnalyzed(): void {
  try {
    sessionStorage.setItem(JUST_ANALYZED_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function clearJustAnalyzedGrace(): void {
  try {
    sessionStorage.removeItem(JUST_ANALYZED_KEY);
  } catch {
    /* ignore */
  }
}

function consumeJustAnalyzedGrace(): boolean {
  try {
    const raw = sessionStorage.getItem(JUST_ANALYZED_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts) || Date.now() - ts > 120_000) {
      sessionStorage.removeItem(JUST_ANALYZED_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function hasRecentAnalyzeSession(): boolean {
  return consumeJustAnalyzedGrace();
}

/** True only when the server has saved reports and session matches. */
export function useHasLiveDashboardAnalysis(result: AnalyzeResult | null | undefined): boolean {
  const { historyReady, savedCount } = useReportSync();
  if (!Boolean(result?.analysis)) return false;
  if (!historyReady) return false;
  return savedCount > 0;
}

export function useReportSync(): ReportSyncContextValue {
  return useContext(ReportSyncContext);
}

export function ReportSyncProvider({ children }: { children: ReactNode }) {
  const { isAuth, ready, user } = useAuth();
  const { result, clearResult, loading: analyzeLoading, loadSavedReport } = useAnalysis();
  const [tick, setTick] = useState(0);
  const [historyReady, setHistoryReady] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [primaryReport, setPrimaryReport] = useState<SavedReportSummaryApi | null>(null);
  const [savedReports, setSavedReports] = useState<SavedReportSummaryApi[]>([]);

  useEffect(() => {
    const onUpdate = () => setTick((n) => n + 1);
    const onRefresh = () => setTick((n) => n + 1);
    const onLogout = () => {
      setHistoryReady(true);
      setSavedCount(0);
      setPrimaryReport(null);
      setSavedReports([]);
      clearAtLetterHtmlCache();
      setTick((n) => n + 1);
    };
    window.addEventListener(LETTER_UPDATED_EVENT, onUpdate);
    window.addEventListener(REPORT_HISTORY_REFRESH_EVENT, onRefresh);
    window.addEventListener(USER_LOGOUT_EVENT, onLogout);
    return () => {
      window.removeEventListener(LETTER_UPDATED_EVENT, onUpdate);
      window.removeEventListener(REPORT_HISTORY_REFRESH_EVENT, onRefresh);
      window.removeEventListener(USER_LOGOUT_EVENT, onLogout);
    };
  }, []);

  useEffect(() => {
    if (!ready || !isAuth) return;
    const sessionAnalysis = getAnalyzeAnalysis(result);
    const statementId = resolveAtLetterStatementId({
      sessionStatementId: result?.statement_id,
      sessionPeriodKey: periodKeyFromLabel(sessionAnalysis?.period_label),
      primaryReport,
    });
    if (statementId) {
      void prefetchAtLetterHtml(statementId);
    }
  }, [ready, isAuth, result?.statement_id, result?.analysis, primaryReport]);

  useEffect(() => {
    if (!ready) {
      setHistoryReady(false);
      setSavedCount(0);
      setPrimaryReport(null);
      setSavedReports([]);
      return;
    }

    if (!isAuth || !user?.userId) {
      setHistoryReady(true);
      setSavedCount(0);
      setPrimaryReport(null);
      setSavedReports([]);
      return;
    }

    let cancelled = false;
    setHistoryReady(false);

    fetchReportHistory()
      .then(async ({ data }) => {
        if (cancelled) return;
        const reports = data.reports ?? [];
        const primary = pickPrimarySavedReport(reports);
        const sorted = [...reports].sort((a, b) => {
          const byPeriod = comparePeriodKeys(a.period_key, b.period_key);
          if (byPeriod !== 0) return byPeriod;
          return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
        });
        setSavedCount(reports.length);
        setPrimaryReport(primary);
        setSavedReports(sorted);
        setHistoryReady(true);

        if (reports.length > 0) {
          try {
            sessionStorage.removeItem(JUST_ANALYZED_KEY);
          } catch {
            /* ignore */
          }

          const sessionAnalysis = getAnalyzeAnalysis(result);
          const sessionKey = periodKeyFromLabel(sessionAnalysis?.period_label);
          const primaryKey = periodKeyFromLabel(primary?.period_label);
          const sessionIsOlderThanPrimary =
            Boolean(primary && sessionKey && primaryKey)
            && comparePeriodKeys(sessionKey, primaryKey) > 0;
          const statementId = resolveAtLetterStatementId({
            sessionStatementId: result?.statement_id,
            sessionPeriodKey: sessionKey,
            primaryReport: primary,
          });
          if (statementId) {
            void prefetchAtLetterHtml(statementId);
          }

          const shouldHydrateFromServer =
            primary
            && !analyzeLoading
            && (
              !result?.analysis
              || sessionIsOlderThanPrimary
              || (result.statement_id && result.statement_id !== primary.statement_id)
            );

          if (shouldHydrateFromServer) {
            try {
              const { data: saved } = await fetchSavedReport(primary.statement_id);
              if (!cancelled) loadSavedReport(saved);
            } catch {
              /* overview can still open saved report manually */
            }
          }
          return;
        }

        setPrimaryReport(null);
        clearAtLetterHtmlCache();
        clearJustAnalyzedGrace();
        if (user.userId) {
          clearUserAtLetterState(user.userId);
        }
        if (!analyzeLoading) {
          clearResult();
        }
      })
      .catch(() => {
        if (cancelled) return;
        setSavedCount(0);
        setPrimaryReport(null);
        setHistoryReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, isAuth, user?.userId, tick, clearResult, analyzeLoading, loadSavedReport, result?.statement_id, result?.analysis]);

  const value = useMemo(
    () => ({ historyReady, savedCount, primaryReport, savedReports }),
    [historyReady, savedCount, primaryReport, savedReports],
  );

  return <ReportSyncContext.Provider value={value}>{children}</ReportSyncContext.Provider>;
}

/** @deprecated Use ReportSyncProvider directly */
export function useSyncSessionWithReports(): void {
  useReportSync();
}
