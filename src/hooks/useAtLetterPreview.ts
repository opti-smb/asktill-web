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
  resolveAtLetterStatementId,
} from '../lib/atLetterStatement';
import { getActiveStatementViewId } from '../lib/activeStatementView';
import { type AnalyzeResult } from '../lib/analyzeResponse';
import { getAnalyzeAnalysis } from '../lib/analyzeResponse';

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
        // Server has no stored month (wiped or never uploaded) — show Brookline sample.
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

  // Logged-in: load the pinned / session month, not always chronologically newest.
  useEffect(() => {
    if (!ready || !isAuth) {
      setSavedReport(null);
      setDetailLoading(false);
      return undefined;
    }

    const activeViewId = getActiveStatementViewId();
    const sessionId = sessionResult?.statement_id?.trim() || null;
    const sessionAnalysis = getAnalyzeAnalysis(sessionResult);
    const targetId = resolveAtLetterStatementId({
      sessionStatementId: sessionId,
      sessionPeriodKey: periodKeyFromLabel(sessionAnalysis?.period_label),
      primaryReport: historyReady ? primaryReport : null,
      historyReady,
      preferSession: hasRecentAnalyzeSession() || Boolean(activeViewId),
      activeViewId,
    });

    if (!targetId) {
      setSavedReport(null);
      setDetailLoading(false);
      return undefined;
    }

    if (
      sessionPreview?.mode === 'live'
      && sessionId === targetId
      && (hasRecentAnalyzeSession() || activeViewId === sessionId)
    ) {
      setSavedReport(null);
      setDetailLoading(false);
      return undefined;
    }

    let cancelled = false;
    setDetailLoading(true);
    setError(null);

    fetchSavedReport(targetId)
      .then(({ data }) => {
        if (cancelled) return;
        setSavedReport(data);
        if (user?.userId) {
          const preview = buildAtLetterPreview(data, user, {
            statementId: targetId,
            hasPdf: Boolean(
              (primaryReport?.statement_id === targetId && primaryReport.has_pdf)
              || data.statement_id,
            ),
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
    historyReady,
    sessionResult?.statement_id,
    sessionResult?.analysis?.period_label,
    sessionPreview?.mode,
    tick,
  ]);

  const sessionPeriodKey = periodKeyFromLabel(sessionResult?.analysis?.period_label);
  const hasServerReports = historyReady && savedCount > 0;
  const activeViewId = getActiveStatementViewId();
  const resolvedStatementId = resolveAtLetterStatementId({
    sessionStatementId: sessionResult?.statement_id,
    sessionPeriodKey,
    primaryReport: historyReady ? primaryReport : null,
    historyReady,
    preferSession: hasRecentAnalyzeSession() || Boolean(activeViewId),
    activeViewId,
  });

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

    if (
      sessionPreview?.mode === 'live'
      && (
        hasRecentAnalyzeSession()
        || !historyReady
        || (resolvedStatementId && sessionResult?.statement_id === resolvedStatementId)
      )
    ) {
      return sessionPreview;
    }

    if (cachedAuthLetter && !historyReady) {
      return cachedAuthLetter;
    }

    if (!historyReady) {
      if (sessionPreview?.mode === 'live') return sessionPreview;
      if (primaryReport) {
        return buildAtLetterFromSummary(primaryReport, user);
      }
      if (cachedAuthLetter) return cachedAuthLetter;
      return buildEmptyAtLetterPreview(user);
    }

    if (!hasServerReports) {
      return buildEmptyAtLetterPreview(user);
    }

    const fromSaved = buildAtLetterPreview(savedReport, user, {
      statementId: resolvedStatementId ?? primaryReport?.statement_id,
      hasPdf: Boolean(primaryReport?.has_pdf),
    });
    if (fromSaved) return fromSaved;

    if (
      sessionPreview?.mode === 'live'
      && resolvedStatementId
      && sessionResult?.statement_id === resolvedStatementId
    ) {
      return sessionPreview;
    }

    if (primaryReport && primaryReport.statement_id === resolvedStatementId) {
      return buildAtLetterFromSummary(primaryReport, user);
    }
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
    resolvedStatementId,
    sessionResult?.statement_id,
  ]);

  const letterWithMeta = useMemo((): AtLetterPreview => {
    const statementId = resolvedStatementId ?? letter.statementId;
    const hasPdf = Boolean(
      (primaryReport?.statement_id === statementId && primaryReport?.has_pdf)
      || letter.hasPdf,
    );
    if (hasServerReports && statementId && !letter.statementId) {
      return { ...letter, statementId, hasPdf: hasPdf || true };
    }
    if (statementId && letter.statementId !== statementId) {
      return { ...letter, statementId, hasPdf };
    }
    return letter;
  }, [letter, primaryReport, hasServerReports, resolvedStatementId]);

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
