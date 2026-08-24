import { useMemo } from 'react';

import { useAnalysis } from '../context/AnalysisContext';
import { useAuth } from '../context/AuthContext';
import {
  atLetterFooterMeta,
  periodKeyFromLabel,
  resolveAtLetterStatementId,
} from '../lib/atLetterStatement';
import { getActiveStatementViewId } from '../lib/activeStatementView';
import { loadAtLetterCache } from '../lib/atLetterCache';
import { hasRecentAnalyzeSession, useReportSync } from '../hooks/useReportSync';
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
  const inAnalyzeGrace = hasRecentAnalyzeSession();

  const cachedStatementId = useMemo(() => {
    if (!user?.userId) return undefined;
    return loadAtLetterCache(user.userId)?.statementId?.trim() || undefined;
  }, [user?.userId]);

  const statementId = useMemo(() => {
    const inGrace = hasRecentAnalyzeSession();
    if (isAuth && historyReady && savedCount === 0 && !inGrace && !sessionStatementId) {
      return undefined;
    }
    const activeViewId = getActiveStatementViewId();
    const resolved = resolveAtLetterStatementId({
      sessionStatementId,
      sessionPeriodKey: periodKeyFromLabel(sessionAnalysis?.period_label),
      primaryReport: historyReady ? primaryReport : null,
      historyReady,
      preferSession: hasRecentAnalyzeSession() || activeViewId === sessionStatementId,
      activeViewId,
    });
    if (resolved) return resolved;
    if (sessionStatementId) return sessionStatementId;
    if (!historyReady && cachedStatementId) return cachedStatementId;
    return undefined;
  }, [
    isAuth,
    historyReady,
    savedCount,
    sessionStatementId,
    sessionAnalysis?.period_label,
    primaryReport,
    cachedStatementId,
  ]);

  const isSample = ready && !isAuth;
  const needsSignIn = false;
  const hasLiveLetter =
    ready
    && isAuth
    && Boolean(statementId)
    && (savedCount > 0 || inAnalyzeGrace || Boolean(sessionAnalysis));
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

  const periodLabel = useMemo(() => {
    const sessionLabel = sessionAnalysis?.period_label;
    const historyLabel = primaryReport?.period_label;
    const activeViewId = getActiveStatementViewId();
    // Pinned / just-analyzed month wins over chronologically newest primary.
    if (activeViewId && sessionStatementId === activeViewId && sessionLabel) {
      return sessionLabel;
    }
    if (statementId && sessionStatementId === statementId && sessionLabel) {
      return sessionLabel;
    }
    if (hasRecentAnalyzeSession() && sessionLabel) {
      return sessionLabel;
    }
    if (statementId && primaryReport?.statement_id === statementId && historyLabel) {
      return historyLabel;
    }
    return sessionLabel ?? historyLabel ?? null;
  }, [
    sessionAnalysis?.period_label,
    primaryReport,
    historyReady,
    statementId,
    sessionStatementId,
  ]);

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
