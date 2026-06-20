import { useMemo } from 'react';

import { useAnalysis } from '../context/AnalysisContext';
import { useAuth } from '../context/AuthContext';
import {
  atLetterFooterMeta,
  periodKeyFromLabel,
  resolveAtLetterStatementId,
} from '../lib/atLetterStatement';
import { useReportSync } from '../hooks/useReportSync';
import { getAnalyzeAnalysis } from '../lib/analyzeResponse';

/** Resolves the saved statement id for backend AT Letter HTML. */
export function useAtLetterTemplate(): {
  statementId?: string;
  periodLabel?: string | null;
  footerMeta: string;
  isSample: boolean;
  needsSignIn: boolean;
  mode: 'sample' | 'live' | 'empty';
  primaryReport: ReturnType<typeof useReportSync>['primaryReport'];
} {
  const { isAuth, ready, user } = useAuth();
  const { result: sessionResult } = useAnalysis();
  const { historyReady, savedCount, primaryReport } = useReportSync();

  const sessionStatementId = sessionResult?.statement_id ?? undefined;
  const sessionAnalysis = getAnalyzeAnalysis(sessionResult);

  const statementId = useMemo(() => {
    if (isAuth && historyReady && savedCount === 0) {
      return undefined;
    }
    return resolveAtLetterStatementId({
      sessionStatementId,
      sessionPeriodKey: periodKeyFromLabel(sessionAnalysis?.period_label),
      primaryReport,
    });
  }, [
    isAuth,
    historyReady,
    savedCount,
    sessionStatementId,
    sessionAnalysis?.period_label,
    primaryReport,
  ]);

  const isSample = ready && !isAuth;
  const needsSignIn = false;
  const hasLiveLetter = ready && isAuth && savedCount > 0 && Boolean(statementId);
  const mode: 'sample' | 'live' | 'empty' = isSample
    ? 'sample'
    : hasLiveLetter
      ? 'live'
      : 'empty';

  const activeReport =
    primaryReport &&
    statementId &&
    primaryReport.statement_id === statementId
      ? primaryReport
      : primaryReport;

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
    primaryReport,
  };
}
