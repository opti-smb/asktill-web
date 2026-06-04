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
  saveAtLetterCache,
  savedLetterUserId,
  userHasSavedLetterHint,
} from '../lib/atLetterCache';
import { fetchReportHistory, fetchSavedReport, getApiError, type SavedReportSummaryApi } from '../lib/api';
import { getAnalyzeAnalysis, type UiAnalysisView } from '../lib/analyzeResponse';

export function useAtLetterPreview(): {
  letter: AtLetterPreview;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  isSample: boolean;
} {
  const { user, isAuth, ready } = useAuth();
  const { result: sessionResult } = useAnalysis();
  const [savedAnalysis, setSavedAnalysis] = useState<UiAnalysisView | null>(null);
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

  const cachedPreview = useMemo(() => {
    if (!isAuth || !user?.userId) return null;
    return loadAtLetterCache(user.userId);
  }, [isAuth, user?.userId, tick]);

  useEffect(() => {
    if (isAuth && user?.userId && sessionPreview?.mode === 'live') {
      saveAtLetterCache(user.userId, sessionPreview);
    }
  }, [isAuth, user?.userId, sessionPreview]);

  useEffect(() => {
    const onLetterUpdated = () => setTick((n) => n + 1);
    window.addEventListener(LETTER_UPDATED_EVENT, onLetterUpdated);
    return () => window.removeEventListener(LETTER_UPDATED_EVENT, onLetterUpdated);
  }, []);

  useEffect(() => {
    if (isAuth && user?.userId) {
      setTick((n) => n + 1);
    }
  }, [isAuth, user?.userId]);

  useEffect(() => {
    if (!ready || !isAuth) {
      setSavedAnalysis(null);
      setLatestSummary(null);
      setStatementId(undefined);
      setHasPdf(false);
      setLoading(false);
      setError(null);
      return;
    }

    if (sessionPreview) {
      setSavedAnalysis(null);
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
        const reports = [...(data.reports ?? [])].sort(
          (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime(),
        );
        const latest = reports[0];
        if (!latest) {
          setSavedAnalysis(null);
          setLatestSummary(null);
          setStatementId(undefined);
          setHasPdf(false);
          return;
        }
        const { data: detail } = await fetchSavedReport(latest.statement_id);
        if (cancelled) return;
        const analysis = getAnalyzeAnalysis(detail);
        setSavedAnalysis(analysis);
        setLatestSummary(latest);
        setStatementId(latest.statement_id);
        setHasPdf(Boolean(latest.has_pdf));
        if (user?.userId) {
          const preview = buildAtLetterPreview({ analysis }, user, {
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
        setSavedAnalysis(null);
        setLatestSummary(null);
        setStatementId(undefined);
        setHasPdf(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, isAuth, sessionPreview, tick, user]);

  const letter = useMemo((): AtLetterPreview => {
    if (!ready) {
      return { ...SAMPLE_AT_LETTER, firstName: '…', periodIntro: 'Loading your letter…' };
    }
    if (!isAuth) {
      if (userHasSavedLetterHint()) {
        const ownerId = savedLetterUserId();
        if (ownerId) {
          const cached = loadAtLetterCache(ownerId);
          if (cached) return cached;
        }
        return buildLoggedOutSavedLetterPreview();
      }
      return SAMPLE_AT_LETTER;
    }
    if (sessionPreview) return sessionPreview;
    if (cachedPreview && loading) return cachedPreview;
    const fromSaved = buildAtLetterPreview(
      savedAnalysis ? { analysis: savedAnalysis } : null,
      user,
      { statementId, hasPdf },
    );
    if (fromSaved) return fromSaved;
    if (latestSummary) return buildAtLetterFromSummary(latestSummary, user);
    if (cachedPreview) return cachedPreview;
    if (loading) return buildEmptyAtLetterPreview(user);
    return buildEmptyAtLetterPreview(user);
  }, [
    ready,
    isAuth,
    sessionPreview,
    savedAnalysis,
    latestSummary,
    cachedPreview,
    user,
    statementId,
    hasPdf,
    loading,
  ]);

  const letterWithMeta = useMemo((): AtLetterPreview => {
    if (statementId && !letter.statementId) {
      return { ...letter, statementId, hasPdf: hasPdf || true };
    }
    return letter;
  }, [letter, statementId, hasPdf]);

  return {
    letter: letterWithMeta,
    loading: !ready || (isAuth && loading && !sessionPreview && !cachedPreview),
    error,
    refresh: () => setTick((n) => n + 1),
    isSample: !isAuth && !userHasSavedLetterHint(),
  };
}
