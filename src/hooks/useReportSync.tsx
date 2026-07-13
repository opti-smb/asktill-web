import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useAnalysis } from '../context/AnalysisContext';
import { useAuth } from '../context/AuthContext';
import { fetchReportHistory, fetchSavedReport, USER_LOGOUT_EVENT, warmupBackend, type SavedReportSummaryApi } from '../lib/api';
import {
  clearUserAtLetterState,
  clearAllAtLetterDeviceCache,
  LETTER_UPDATED_EVENT,
  loadAtLetterCache,
} from '../lib/atLetterCache';
import { clearAtLetterHtmlCache, prefetchAtLetterHtml } from '../lib/atLetterHtmlCache';
import { getActiveStatementViewId } from '../lib/activeStatementView';
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

function peekJustAnalyzedGrace(): boolean {
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
  return peekJustAnalyzedGrace();
}

/** True when dashboard tabs can render live analysis (not welcome/empty). */
export function useHasLiveDashboardAnalysis(result: AnalyzeResult | null | undefined): boolean {
  const { historyReady, savedCount } = useReportSync();
  if (Boolean(result?.analysis)) return true;
  if (peekJustAnalyzedGrace() && result?.statement_id) return true;
  if (!historyReady) return false;
  if (savedCount > 0) return true;
  return Boolean(result?.statement_id);
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
  const resultRef = useRef(result);
  const analyzeLoadingRef = useRef(analyzeLoading);
  const hydratedStatementIdRef = useRef<string | null>(null);
  const historyReadyRef = useRef(historyReady);
  const savedCountRef = useRef(savedCount);

  resultRef.current = result;
  analyzeLoadingRef.current = analyzeLoading;
  historyReadyRef.current = historyReady;
  savedCountRef.current = savedCount;

  useEffect(() => {
    hydratedStatementIdRef.current = null;
  }, [user?.userId, tick]);

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
    if (!ready || !isAuth || !user?.userId) return;
    if (result?.statement_id || hasRecentAnalyzeSession()) return;
    const cachedId = loadAtLetterCache(user.userId)?.statementId?.trim();
    if (cachedId) {
      void prefetchAtLetterHtml(cachedId, { monthOnly: true });
      void prefetchAtLetterHtml(cachedId, { monthOnly: false });
    }
  }, [ready, isAuth, user?.userId, result?.statement_id]);

  useEffect(() => {
    if (!ready || !isAuth) return;
    const sessionAnalysis = getAnalyzeAnalysis(result);
    const statementId = resolveAtLetterStatementId({
      sessionStatementId: result?.statement_id,
      sessionPeriodKey: periodKeyFromLabel(sessionAnalysis?.period_label),
      primaryReport,
      historyReady,
      preferSession: hasRecentAnalyzeSession(),
      activeViewId: getActiveStatementViewId(),
    });
    if (statementId) {
      void prefetchAtLetterHtml(statementId, { monthOnly: true });
      void prefetchAtLetterHtml(statementId, { monthOnly: false });
    }
  }, [ready, isAuth, result?.statement_id, result?.analysis, primaryReport, historyReady]);

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
    const isBackgroundRefresh = historyReadyRef.current && savedCountRef.current > 0;
    const keepVisible = isBackgroundRefresh || hasRecentAnalyzeSession();
    if (!keepVisible) {
      setHistoryReady(false);
    }

    warmupBackend();
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

        if (reports.length > 0) {
          const sessionResult = resultRef.current;
          const sessionAnalysis = getAnalyzeAnalysis(sessionResult);
          const sessionStatementId = sessionResult?.statement_id?.trim();
          const activeViewId = getActiveStatementViewId()?.trim() || null;
          const effectiveSessionId = activeViewId || sessionStatementId || null;
          const sessionReport = effectiveSessionId
            ? reports.find((row) => row.statement_id === effectiveSessionId)
            : undefined;
          const sessionKey =
            periodKeyFromLabel(sessionAnalysis?.period_label)
            ?? sessionReport?.period_key
            ?? null;
          const inAnalyzeGrace = hasRecentAnalyzeSession();
          const pinnedId = activeViewId || (inAnalyzeGrace ? sessionStatementId : null);
          const keepPinnedView = Boolean(
            pinnedId
            && primary?.statement_id
            && pinnedId !== primary.statement_id,
          );
          const keepCurrentSessionView = Boolean(
            sessionAnalysis
            && sessionStatementId
            && (keepPinnedView || inAnalyzeGrace || pinnedId === sessionStatementId),
          );

          const statementId = resolveAtLetterStatementId({
            sessionStatementId: effectiveSessionId,
            sessionPeriodKey: sessionKey,
            primaryReport: primary,
            historyReady: true,
            preferSession: inAnalyzeGrace || keepPinnedView || keepCurrentSessionView,
            activeViewId: pinnedId,
          });
          if (statementId) {
            void prefetchAtLetterHtml(statementId, { monthOnly: true });
            void prefetchAtLetterHtml(statementId, { monthOnly: false });
          }

          // Pinned / just-uploaded month must never be replaced by chronologically newest.
          if (pinnedId) {
            const needsHydrate =
              !sessionAnalysis
              || (sessionStatementId && pinnedId !== sessionStatementId)
              || (sessionAnalysis && sessionStatementId !== pinnedId);
            if (needsHydrate && hydratedStatementIdRef.current !== pinnedId) {
              hydratedStatementIdRef.current = pinnedId;
              try {
                const { data: saved } = await fetchSavedReport(pinnedId);
                if (!cancelled) loadSavedReport(saved);
              } catch {
                /* keep partial session payload */
              }
            }
          } else if (!keepCurrentSessionView) {
            // Fresh login / no pin: chronologically latest month.
            const shouldHydrateFromServer =
              primary
              && !analyzeLoadingRef.current
              && !sessionResult?.analysis;

            if (
              shouldHydrateFromServer
              && hydratedStatementIdRef.current !== primary.statement_id
            ) {
              hydratedStatementIdRef.current = primary.statement_id;
              try {
                const { data: saved } = await fetchSavedReport(primary.statement_id);
                if (!cancelled) loadSavedReport(saved);
              } catch {
                /* overview can still open saved report manually */
              }
            }
          }
        }

        setHistoryReady(true);

        if (reports.length > 0) {
          return;
        }

        const sessionResult = resultRef.current;
        const keepSession =
          hasRecentAnalyzeSession()
          || Boolean(getAnalyzeAnalysis(sessionResult))
          || Boolean(sessionResult?.statement_id?.trim());
        if (keepSession) {
          return;
        }

        hydratedStatementIdRef.current = null;
        setPrimaryReport(null);
        clearAtLetterHtmlCache();
        clearJustAnalyzedGrace();
        if (user.userId) {
          clearUserAtLetterState(user.userId);
        }
        clearAllAtLetterDeviceCache();
        if (!analyzeLoadingRef.current) {
          clearResult();
        }
      })
      .catch(async () => {
        if (cancelled) return;
        if (!isBackgroundRefresh) {
          const cachedId = user?.userId
            ? loadAtLetterCache(user.userId)?.statementId?.trim()
            : undefined;
          if (cachedId) {
            try {
              const { data: saved } = await fetchSavedReport(cachedId);
              if (!cancelled) {
                loadSavedReport(saved);
                setSavedCount(1);
                setHistoryReady(true);
                return;
              }
            } catch {
              /* fall through */
            }
          }
          setSavedCount(0);
          setPrimaryReport(null);
          setSavedReports([]);
        }
        setHistoryReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, isAuth, user?.userId, tick, clearResult, loadSavedReport]);

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
