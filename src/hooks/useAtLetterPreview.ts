import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAnalysis } from '../context/AnalysisContext';
import {
  buildAtLetterPreview,
  buildAtLetterFromSummary,
  buildEmptyAtLetterPreview,
  buildLoggedOutSavedLetterPreview,
  SAMPLE_AT_LETTER,
  type AtLetterPreview,
} from '../lib/atLetterPreview';
import {
  LETTER_UPDATED_EVENT,
  loadLandingAtLetterCache,
  saveAtLetterCache,
  clearUserAtLetterState,
  userHasSavedLetterHint,
} from '../lib/atLetterCache';
import { REPORT_HISTORY_REFRESH_EVENT, useReportSync } from '../hooks/useReportSync';
import {
  fetchReportHistory,
  fetchSavedReport,
  getApiError,
  USER_LOGOUT_EVENT,
  type SavedReportSummaryApi,
} from '../lib/api';
import {
  periodKeyFromLabel,
  pickPrimarySavedReport,
  sessionAnalyzeIsLatest,
} from '../lib/atLetterStatement';
import { type AnalyzeResult } from '../lib/analyzeResponse';

function welcomeLoading(user: ReturnType<typeof useAuth>['user'], message: string): AtLetterPreview {
  return { ...buildEmptyAtLetterPreview(user), periodIntro: message };
}

export function useAtLetterPreview(): {
  letter: AtLetterPreview;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  isSample: boolean;
} {
  const { user, isAuth, ready } = useAuth();
  const { result: sessionResult } = useAnalysis();
  const { historyReady, savedCount } = useReportSync();
  const [savedReport, setSavedReport] = useState<AnalyzeResult | null>(null);
  const [latestSummary, setLatestSummary] = useState<SavedReportSummaryApi | null>(null);
  const [statementId, setStatementId] = useState<string | undefined>();
  const [hasPdf, setHasPdf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const sessionPreview = useMemo(
    () => buildAtLetterPreview(sessionResult, user),
    [sessionResult, user],
  );

  useEffect(() => {
    if (
      isAuth &&
      user?.userId &&
      savedCount > 0 &&
      sessionPreview?.mode === 'live' &&
      latestSummary
    ) {
      saveAtLetterCache(user.userId, sessionPreview);
    }
  }, [isAuth, user?.userId, sessionPreview, latestSummary, savedCount]);

  useEffect(() => {
    const onRefresh = () => setTick((n) => n + 1);
    const onLogout = () => {
      setSavedReport(null);
      setLatestSummary(null);
      setStatementId(undefined);
      setHasPdf(false);
      setLoading(false);
      setError(null);
      setTick((n) => n + 1);
    };
    window.addEventListener(LETTER_UPDATED_EVENT, onRefresh);
    window.addEventListener(REPORT_HISTORY_REFRESH_EVENT, onRefresh);
    window.addEventListener(USER_LOGOUT_EVENT, onLogout);
    return () => {
      window.removeEventListener(LETTER_UPDATED_EVENT, onRefresh);
      window.removeEventListener(REPORT_HISTORY_REFRESH_EVENT, onRefresh);
      window.removeEventListener(USER_LOGOUT_EVENT, onLogout);
    };
  }, []);

  useEffect(() => {
    if (isAuth && user?.userId) {
      setTick((n) => n + 1);
    }
  }, [isAuth, user?.userId]);

  useEffect(() => {
    if (!ready || !isAuth) {
      setSavedReport(null);
      setLatestSummary(null);
      setStatementId(undefined);
      setHasPdf(false);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchReportHistory()
      .then(async ({ data }) => {
        if (cancelled) return;
        const reports = data.reports ?? [];
        const latest = pickPrimarySavedReport(reports);
        if (!latest) {
          setSavedReport(null);
          setLatestSummary(null);
          setStatementId(undefined);
          setHasPdf(false);
          if (user?.userId) {
            clearUserAtLetterState(user.userId);
          }
          return;
        }
        setLatestSummary(latest);
        setStatementId(latest.statement_id);
        setHasPdf(Boolean(latest.has_pdf));
        const { data: detail } = await fetchSavedReport(latest.statement_id);
        if (cancelled) return;
        setSavedReport(detail);
        if (user?.userId) {
          const preview = buildAtLetterPreview(detail, user, {
            statementId: latest.statement_id,
            hasPdf: Boolean(latest.has_pdf),
          });
          if (preview?.mode === 'live') {
            saveAtLetterCache(user.userId, preview);
          }
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getApiError(err, 'Could not load your AT Letter.'));
        setSavedReport(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, isAuth, tick, user]);

  const sessionPeriodKey = periodKeyFromLabel(sessionResult?.analysis?.period_label);
  const hasServerReports = historyReady && savedCount > 0;
  const loggedOutCachedLetter = useMemo(
    () => (isAuth ? null : loadLandingAtLetterCache()),
    [isAuth, tick],
  );

  const letter = useMemo((): AtLetterPreview => {
    if (!ready) {
      return welcomeLoading(isAuth ? user : null, 'Loading your letter…');
    }

    if (!isAuth) {
      if (loggedOutCachedLetter) return loggedOutCachedLetter;
      if (userHasSavedLetterHint()) return buildLoggedOutSavedLetterPreview();
      return SAMPLE_AT_LETTER;
    }

    if (!historyReady || loading) {
      return welcomeLoading(user, 'Checking your saved reports…');
    }

    if (!hasServerReports) {
      return buildEmptyAtLetterPreview(user);
    }

    if (!latestSummary && !savedReport) {
      return welcomeLoading(user, 'Loading your letter…');
    }

    const sessionIsLatest = sessionAnalyzeIsLatest({
      sessionPeriodKey,
      primaryReport: latestSummary,
    });

    if (sessionPreview && sessionIsLatest && latestSummary) {
      return sessionPreview;
    }

    const fromSaved = buildAtLetterPreview(savedReport, user, { statementId, hasPdf });
    if (fromSaved) return fromSaved;
    if (latestSummary) return buildAtLetterFromSummary(latestSummary, user);

    return buildEmptyAtLetterPreview(user);
  }, [
    ready,
    isAuth,
    user,
    historyReady,
    loading,
    hasServerReports,
    savedCount,
    sessionPreview,
    sessionPeriodKey,
    savedReport,
    latestSummary,
    statementId,
    hasPdf,
    loggedOutCachedLetter,
  ]);

  const letterWithMeta = useMemo((): AtLetterPreview => {
    if (hasServerReports && statementId && !letter.statementId) {
      return { ...letter, statementId, hasPdf: hasPdf || true };
    }
    return letter;
  }, [letter, statementId, hasPdf, hasServerReports]);

  return {
    letter: letterWithMeta,
    loading: !ready || (isAuth && !historyReady),
    error,
    refresh: () => setTick((n) => n + 1),
    isSample:
      !isAuth
        ? !loggedOutCachedLetter && !userHasSavedLetterHint()
        : letterWithMeta.mode === 'sample',
  };
}
