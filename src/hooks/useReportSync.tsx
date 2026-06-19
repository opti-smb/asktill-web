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
import { fetchReportHistory, USER_LOGOUT_EVENT } from '../lib/api';
import { clearUserAtLetterState, LETTER_UPDATED_EVENT } from '../lib/atLetterCache';
import type { AnalyzeResult } from '../lib/analyzeResponse';

const JUST_ANALYZED_KEY = 'asktill:just-analyzed';

export const REPORT_HISTORY_REFRESH_EVENT = 'asktill:report-history-refresh';

interface ReportSyncContextValue {
  historyReady: boolean;
  savedCount: number;
}

const ReportSyncContext = createContext<ReportSyncContextValue>({
  historyReady: false,
  savedCount: 0,
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
  const { clearResult, loading: analyzeLoading } = useAnalysis();
  const [tick, setTick] = useState(0);
  const [historyReady, setHistoryReady] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    const onUpdate = () => setTick((n) => n + 1);
    const onRefresh = () => setTick((n) => n + 1);
    const onLogout = () => {
      setHistoryReady(true);
      setSavedCount(0);
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
    if (!ready) {
      setHistoryReady(false);
      setSavedCount(0);
      return;
    }

    if (!isAuth || !user?.userId) {
      setHistoryReady(true);
      setSavedCount(0);
      return;
    }

    let cancelled = false;
    setHistoryReady(false);

    fetchReportHistory()
      .then(({ data }) => {
        if (cancelled) return;
        const reports = data.reports ?? [];
        setSavedCount(reports.length);
        setHistoryReady(true);

        if (reports.length > 0) {
          try {
            sessionStorage.removeItem(JUST_ANALYZED_KEY);
          } catch {
            /* ignore */
          }
          return;
        }

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
        setHistoryReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, isAuth, user?.userId, tick, clearResult, analyzeLoading]);

  const value = useMemo(
    () => ({ historyReady, savedCount }),
    [historyReady, savedCount],
  );

  return <ReportSyncContext.Provider value={value}>{children}</ReportSyncContext.Provider>;
}

/** @deprecated Use ReportSyncProvider directly */
export function useSyncSessionWithReports(): void {
  useReportSync();
}
