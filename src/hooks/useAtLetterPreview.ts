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
  loadAtLetterCache,
  loadLandingAtLetterCache,
  markUserHasSavedLetter,
  saveAtLetterCache,
  clearUserAtLetterState,
  clearAllAtLetterDeviceCache,
  savedLetterUserId,
  userHasSavedLetterHint,
} from '../lib/atLetterCache';
import { hasRecentAnalyzeSession, REPORT_HISTORY_REFRESH_EVENT, useReportSync } from '../hooks/useReportSync';
import {
  fetchAtLetterLandingMeta,
  fetchSavedReport,
  getApiError,
  USER_LOGOUT_EVENT,
} from '../lib/api';
import {
  periodKeyFromLabel,
  sessionAnalyzeIsLatest,
} from '../lib/atLetterStatement';
import { type AnalyzeResult } from '../lib/analyzeResponse';

function initialLandingSource(): 'user' | 'sample' {
  if (loadLandingAtLetterCache()) return 'user';
  if (userHasSavedLetterHint()) return 'user';
  return 'sample';
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
  const { historyReady, savedCount, primaryReport } = useReportSync();
  const [savedReport, setSavedReport] = useState<AnalyzeResult | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [landingSource, setLandingSource] = useState<'user' | 'sample'>(initialLandingSource);

  const sessionPreview = useMemo(
    () => buildAtLetterPreview(sessionResult, user),
    [sessionResult, user],
  );

  const cachedAuthLetter = useMemo(
    () => (isAuth && user?.userId ? loadAtLetterCache(user.userId) : null),
    [isAuth, user?.userId, tick],
  );

  useEffect(() => {
    if (
      isAuth &&
      user?.userId &&
      savedCount > 0 &&
      sessionPreview?.mode === 'live' &&
      primaryReport
    ) {
      saveAtLetterCache(user.userId, sessionPreview);
    }
  }, [isAuth, user?.userId, sessionPreview, primaryReport, savedCount]);

  useEffect(() => {
    const onRefresh = () => setTick((n) => n + 1);
    const onLogout = () => {
      setSavedReport(null);
      setDetailLoading(false);
      setError(null);
      setLandingSource(loadLandingAtLetterCache() ? 'user' : 'sample');
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

  // Logged-out landing: show sample/cache immediately; verify with API in background.
  useEffect(() => {
    if (!ready || isAuth) return;

    const userId = savedLetterUserId();
    let cancelled = false;

    void fetchAtLetterLandingMeta(userId ? { userId } : undefined)
      .then(({ data }) => {
        if (cancelled) return;
        if (data.source === 'user') {
          setLandingSource('user');
          if (data.user_id) markUserHasSavedLetter(data.user_id);
          return;
        }
        // Server has no stored month — keep device cache if the user analyzed on this browser.
        const cached = loadLandingAtLetterCache();
        if (cached) {
          setLandingSource('user');
          return;
        }
        setLandingSource('sample');
        if (userId) {
          clearUserAtLetterState(userId);
        } else {
          clearAllAtLetterDeviceCache();
        }
      })
      .catch(() => {
        if (cancelled) return;
        setLandingSource(loadLandingAtLetterCache() || userHasSavedLetterHint() ? 'user' : 'sample');
      });

    return () => {
      cancelled = true;
    };
  }, [ready, isAuth, tick]);

  // Logged-in: reuse report sync — fetch full detail only when summary is not enough.
  useEffect(() => {
    if (!ready || !isAuth || !primaryReport?.statement_id) {
      setSavedReport(null);
      setDetailLoading(false);
      return undefined;
    }

    const sessionPeriodKey = periodKeyFromLabel(sessionResult?.analysis?.period_label);
    const sessionIsLatest = sessionAnalyzeIsLatest({
      sessionPeriodKey,
      primaryReport,
    });
    if (sessionPreview?.mode === 'live' && sessionIsLatest) {
      setSavedReport(null);
      setDetailLoading(false);
      return undefined;
    }

    let cancelled = false;
    setDetailLoading(true);
    setError(null);

    fetchSavedReport(primaryReport.statement_id)
      .then(({ data }) => {
        if (cancelled) return;
        setSavedReport(data);
        if (user?.userId) {
          const preview = buildAtLetterPreview(data, user, {
            statementId: primaryReport.statement_id,
            hasPdf: Boolean(primaryReport.has_pdf),
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
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    ready,
    isAuth,
    user?.userId,
    primaryReport?.statement_id,
    primaryReport?.period_label,
    primaryReport?.has_pdf,
    sessionResult?.statement_id,
    sessionResult?.analysis?.period_label,
    sessionPreview?.mode,
    tick,
  ]);

  const sessionPeriodKey = periodKeyFromLabel(sessionResult?.analysis?.period_label);
  const hasServerReports = historyReady && savedCount > 0;

  const letter = useMemo((): AtLetterPreview => {
    if (!ready) {
      return isAuth ? buildEmptyAtLetterPreview(user) : SAMPLE_AT_LETTER;
    }

    if (!isAuth) {
      const cached = loadLandingAtLetterCache();
      if (cached) return cached;
      if (landingSource === 'user') {
        return buildLoggedOutSavedLetterPreview();
      }
      return SAMPLE_AT_LETTER;
    }

    if (sessionPreview?.mode === 'live' && (hasRecentAnalyzeSession() || !historyReady)) {
      return sessionPreview;
    }

    if (cachedAuthLetter && !historyReady) {
      return cachedAuthLetter;
    }

    if (!historyReady) {
      if (primaryReport) {
        return buildAtLetterFromSummary(primaryReport, user);
      }
      if (cachedAuthLetter) return cachedAuthLetter;
      if (sessionPreview?.mode === 'live') return sessionPreview;
      return buildEmptyAtLetterPreview(user);
    }

    if (!hasServerReports) {
      return buildEmptyAtLetterPreview(user);
    }

    const sessionIsLatest = sessionAnalyzeIsLatest({
      sessionPeriodKey,
      primaryReport,
    });

    if (sessionPreview && sessionIsLatest && primaryReport) {
      return sessionPreview;
    }

    const fromSaved = buildAtLetterPreview(savedReport, user, {
      statementId: primaryReport?.statement_id,
      hasPdf: Boolean(primaryReport?.has_pdf),
    });
    if (fromSaved) return fromSaved;
    if (primaryReport) return buildAtLetterFromSummary(primaryReport, user);
    if (cachedAuthLetter) return cachedAuthLetter;

    return buildEmptyAtLetterPreview(user);
  }, [
    ready,
    isAuth,
    user,
    historyReady,
    hasServerReports,
    sessionPreview,
    sessionPeriodKey,
    savedReport,
    primaryReport,
    cachedAuthLetter,
    landingSource,
  ]);

  const letterWithMeta = useMemo((): AtLetterPreview => {
    const statementId = primaryReport?.statement_id ?? letter.statementId;
    const hasPdf = Boolean(primaryReport?.has_pdf ?? letter.hasPdf);
    if (hasServerReports && statementId && !letter.statementId) {
      return { ...letter, statementId, hasPdf: hasPdf || true };
    }
    return letter;
  }, [letter, primaryReport, hasServerReports]);

  const authCanShow =
    Boolean(cachedAuthLetter)
    || sessionPreview?.mode === 'live'
    || Boolean(primaryReport)
    || (historyReady && savedCount === 0);

  return {
    letter: letterWithMeta,
    loading: !ready || (isAuth && !authCanShow && (detailLoading || !historyReady)),
    error,
    refresh: () => setTick((n) => n + 1),
    isSample: letterWithMeta.mode === 'sample',
  };
}
