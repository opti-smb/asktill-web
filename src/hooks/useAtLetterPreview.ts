import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAnalysis } from '../context/AnalysisContext';
import {
  buildAtLetterPreview,
  buildEmptyAtLetterPreview,
  SAMPLE_AT_LETTER,
  type AtLetterPreview,
} from '../lib/atLetterPreview';
import { fetchReportHistory, fetchSavedReport, getApiError } from '../lib/api';
import { getAnalyzeAnalysis, type UiAnalysisView } from '../lib/analyzeResponse';

export function useAtLetterPreview(): {
  letter: AtLetterPreview;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const { user, isAuth, ready } = useAuth();
  const { result: sessionResult } = useAnalysis();
  const [savedAnalysis, setSavedAnalysis] = useState<UiAnalysisView | null>(null);
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
    if (!ready || !isAuth) {
      setSavedAnalysis(null);
      setStatementId(undefined);
      setHasPdf(false);
      setLoading(false);
      setError(null);
      return;
    }

    if (sessionPreview) {
      setSavedAnalysis(null);
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
          setStatementId(undefined);
          setHasPdf(false);
          return;
        }
        const { data: detail } = await fetchSavedReport(latest.statement_id);
        if (cancelled) return;
        setSavedAnalysis(getAnalyzeAnalysis(detail));
        setStatementId(latest.statement_id);
        setHasPdf(Boolean(latest.has_pdf));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getApiError(err, 'Could not load your AT Letter.'));
        setSavedAnalysis(null);
        setStatementId(undefined);
        setHasPdf(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, isAuth, sessionPreview, tick]);

  const letter = useMemo((): AtLetterPreview => {
    if (!ready || !isAuth) return SAMPLE_AT_LETTER;
    if (sessionPreview) return sessionPreview;
    const fromSaved = buildAtLetterPreview(
      savedAnalysis ? { analysis: savedAnalysis } : null,
      user,
      { statementId, hasPdf },
    );
    if (fromSaved) return fromSaved;
    if (loading) return buildEmptyAtLetterPreview(user);
    return buildEmptyAtLetterPreview(user);
  }, [ready, isAuth, sessionPreview, savedAnalysis, user, statementId, hasPdf, loading]);

  return {
    letter,
    loading: isAuth && loading && !sessionPreview,
    error,
    refresh: () => setTick((n) => n + 1),
  };
}
