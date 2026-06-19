import { useEffect, useMemo, useState } from 'react';

import { useAnalysis } from '../context/AnalysisContext';
import { useAuth } from '../context/AuthContext';
import {
  atLetterFooterMeta,
  periodKeyFromLabel,
  pickPrimarySavedReport,
  resolveAtLetterStatementId,
} from '../lib/atLetterStatement';
import { fetchReportHistory, type SavedReportSummaryApi } from '../lib/api';
import { LETTER_UPDATED_EVENT, userHasSavedLetterHint } from '../lib/atLetterCache';
import { REPORT_HISTORY_REFRESH_EVENT, useReportSync } from '../hooks/useReportSync';
import { getAnalyzeAnalysis } from '../lib/analyzeResponse';

/** Resolves the saved statement id for backend AT Letter PDF download. */
export function useAtLetterTemplate(): {
  statementId?: string;
  periodLabel?: string | null;
  footerMeta: string;
  isSample: boolean;
  needsSignIn: boolean;
  mode: 'sample' | 'live' | 'empty';
  primaryReport: SavedReportSummaryApi | null;
} {
  const { isAuth, ready, user } = useAuth();
  const { result: sessionResult } = useAnalysis();
  const { historyReady, savedCount } = useReportSync();

  const [historyReport, setHistoryReport] = useState<SavedReportSummaryApi | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onRefresh = () => setTick((n) => n + 1);
    window.addEventListener(LETTER_UPDATED_EVENT, onRefresh);
    window.addEventListener(REPORT_HISTORY_REFRESH_EVENT, onRefresh);
    return () => {
      window.removeEventListener(LETTER_UPDATED_EVENT, onRefresh);
      window.removeEventListener(REPORT_HISTORY_REFRESH_EVENT, onRefresh);
    };
  }, []);

  const sessionStatementId = sessionResult?.statement_id ?? undefined;
  const sessionAnalysis = getAnalyzeAnalysis(sessionResult);

  const statementId = useMemo(() => {
    if (isAuth && historyReady && savedCount === 0) {
      return undefined;
    }
    return resolveAtLetterStatementId({
      sessionStatementId,
      sessionPeriodKey: periodKeyFromLabel(sessionAnalysis?.period_label),
      primaryReport: historyReport,
    });
  }, [
    isAuth,
    historyReady,
    savedCount,
    sessionStatementId,
    sessionAnalysis?.period_label,
    historyReport,
  ]);

  useEffect(() => {
    if (!ready || !isAuth) {
      setHistoryReport(null);
      return;
    }

    let cancelled = false;
    fetchReportHistory()
      .then(({ data }) => {
        if (!cancelled) {
          setHistoryReport(pickPrimarySavedReport(data.reports ?? []));
        }
      })
      .catch(() => {
        if (!cancelled) setHistoryReport(null);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, isAuth, tick, sessionStatementId]);

  const isSample = ready && !isAuth && !userHasSavedLetterHint();
  const needsSignIn = ready && !isAuth && userHasSavedLetterHint();
  const hasLiveLetter = ready && isAuth && savedCount > 0 && Boolean(statementId);
  const mode: 'sample' | 'live' | 'empty' = isSample
    ? 'sample'
    : hasLiveLetter
      ? 'live'
      : 'empty';

  const activeReport =
    historyReport &&
    statementId &&
    historyReport.statement_id === statementId
      ? historyReport
      : historyReport;

  const periodLabel =
    sessionAnalysis?.period_label ??
    activeReport?.period_label ??
    null;

  const footerMeta = useMemo(() => {
    if (activeReport && statementId === activeReport.statement_id) {
      return atLetterFooterMeta(activeReport, user?.businessName);
    }
    if (sessionAnalysis && sessionStatementId === statementId) {
      const business = sessionAnalysis.business_name ?? user?.businessName;
      const label = sessionAnalysis.period_label;
      return [label, business].filter(Boolean).join(' · ') || 'Your business';
    }
    return user?.businessName?.trim() || 'Your business';
  }, [
    activeReport,
    statementId,
    sessionAnalysis,
    sessionStatementId,
    user?.businessName,
  ]);

  return {
    statementId,
    periodLabel,
    footerMeta,
    isSample,
    needsSignIn,
    mode,
    primaryReport: historyReport,
  };
}
