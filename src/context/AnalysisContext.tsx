import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import {
  analyzeWithProgress,
  extractStatementDuplicate,
  extractUploadMismatches,
  fetchSavedReportWithRetry,
  getApiError,
  recoverSavedAnalyzeFromHistory,
  statementIdFromProgressEvent,
  type StatementDuplicateInfo,
  USER_LOGOUT_EVENT,
  USER_STATE_RESET_EVENT,
  type UploadFiles,
  type UploadValidationResult,
} from '../lib/api';
import { buildAtLetterPreview } from '../lib/atLetterPreview';
import {
  LETTER_UPDATED_EVENT,
  markUserHasSavedLetter,
  saveAtLetterCache,
} from '../lib/atLetterCache';
import { prefetchAtLetterHtml } from '../lib/atLetterHtmlCache';
import { markJustAnalyzed, clearJustAnalyzedGrace, REPORT_HISTORY_REFRESH_EVENT } from '../hooks/useReportSync';
import {
  applyPipelineEvent,
  buildInitialAnalyzeProgress,
  estimatePipelineWhileWaiting,
  isPipelineDisplayComplete,
  PIPELINE_DONE_HOLD_MS,
  PIPELINE_ESTIMATE_MS,
  PIPELINE_TICK_MS,
  shouldRunPipelineTick,
  tickPipelineForward,
  type AnalyzeProgressState,
} from '../lib/analyzeProgress';
import type { AnalyzeResult, WeekReportsViewApi } from '../lib/analyzeResponse';

interface AnalysisContextValue {
  files: UploadFiles;
  result: AnalyzeResult | null;
  loading: boolean;
  analyzeProgress: AnalyzeProgressState | null;
  error: string | null;
  uploadMismatch: UploadValidationResult | null;
  statementDuplicate: StatementDuplicateInfo | null;
  setFiles: (files: UploadFiles) => void;
  runAnalyze: (
    files?: UploadFiles,
    options?: { force?: boolean },
  ) => Promise<AnalyzeResult | null>;
  applyStatementDuplicate: (info: StatementDuplicateInfo | null) => void;
  clearError: () => void;
  clearUploadMismatch: () => void;
  clearStatementDuplicate: () => void;
  mergeWeekReports: (weekReports: WeekReportsViewApi) => void;
  loadSavedReport: (saved: AnalyzeResult) => void;
  clearResult: () => void;
  lastStreamStatementId: string | null;
}

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const { user, isAuth } = useAuth();
  const [files, setFilesState] = useState<UploadFiles>({});
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState<AnalyzeProgressState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadMismatch, setUploadMismatch] = useState<UploadValidationResult | null>(null);
  const [statementDuplicate, setStatementDuplicate] = useState<StatementDuplicateInfo | null>(null);
  const pipelineFinishRef = useRef<(() => void) | null>(null);
  const pipelineSafetyRef = useRef<number | null>(null);
  const lastStreamStatementIdRef = useRef<string | null>(null);
  const [lastStreamStatementId, setLastStreamStatementId] = useState<string | null>(null);

  const clearPipelineWaiters = useCallback(() => {
    if (pipelineSafetyRef.current != null) {
      window.clearTimeout(pipelineSafetyRef.current);
      pipelineSafetyRef.current = null;
    }
    pipelineFinishRef.current = null;
  }, []);

  /** Wait for step animation to finish after the server already returned. */
  const waitForPipelineDisplay = useCallback(() => {
    return new Promise<void>((resolve) => {
      clearPipelineWaiters();
      pipelineFinishRef.current = resolve;
      pipelineSafetyRef.current = window.setTimeout(() => {
        pipelineFinishRef.current = null;
        pipelineSafetyRef.current = null;
        setAnalyzeProgress(null);
        resolve();
      }, 2500);
    });
  }, [clearPipelineWaiters]);

  const setFiles = useCallback((next: UploadFiles) => {
    setFilesState(next);
  }, []);

  const clearError = useCallback(() => setError(null), []);
  const clearUploadMismatch = useCallback(() => setUploadMismatch(null), []);
  const clearStatementDuplicate = useCallback(() => setStatementDuplicate(null), []);
  const applyStatementDuplicate = useCallback(
    (info: StatementDuplicateInfo | null) => setStatementDuplicate(info),
    [],
  );

  const resetSession = useCallback(() => {
    clearJustAnalyzedGrace();
    clearPipelineWaiters();
    setFilesState({});
    setResult(null);
    setLoading(false);
    setAnalyzeProgress(null);
    setError(null);
    setUploadMismatch(null);
    setStatementDuplicate(null);
  }, []);

  useEffect(() => {
    const onReset = () => resetSession();
    window.addEventListener(USER_LOGOUT_EVENT, onReset);
    window.addEventListener(USER_STATE_RESET_EVENT, onReset);
    return () => {
      window.removeEventListener(USER_LOGOUT_EVENT, onReset);
      window.removeEventListener(USER_STATE_RESET_EVENT, onReset);
    };
  }, [resetSession]);

  useEffect(() => {
    if (!analyzeProgress || analyzeProgress.complete) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setAnalyzeProgress((prev) => {
        if (!prev) return prev;
        return estimatePipelineWhileWaiting(prev) ?? prev;
      });
    }, PIPELINE_ESTIMATE_MS);
    return () => window.clearInterval(timer);
  }, [analyzeProgress]);

  useEffect(() => {
    if (!analyzeProgress || !shouldRunPipelineTick(analyzeProgress)) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setAnalyzeProgress((prev) => {
        if (!prev) return prev;
        return tickPipelineForward(prev) ?? prev;
      });
    }, PIPELINE_TICK_MS);
    return () => window.clearTimeout(timer);
  }, [analyzeProgress]);

  useEffect(() => {
    if (!analyzeProgress || !isPipelineDisplayComplete(analyzeProgress)) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setAnalyzeProgress(null);
      if (pipelineSafetyRef.current != null) {
        window.clearTimeout(pipelineSafetyRef.current);
        pipelineSafetyRef.current = null;
      }
      pipelineFinishRef.current?.();
      pipelineFinishRef.current = null;
    }, PIPELINE_DONE_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [analyzeProgress]);

  const runAnalyze = useCallback(async (
    override?: UploadFiles,
    options?: { force?: boolean },
  ) => {
    const active = override ?? files;
    if (!active.bank && !active.pos && !active.ecommerce) {
      setError(
        'Please upload at least one statement — bank, POS, or ecommerce — before continuing.',
      );
      return null;
    }

    setLoading(true);
    setError(null);
    setUploadMismatch(null);
    lastStreamStatementIdRef.current = null;
    setLastStreamStatementId(null);

    let progressStarted = false;
    const ensureProgress = () => {
      if (progressStarted) return;
      progressStarted = true;
      setAnalyzeProgress(buildInitialAnalyzeProgress());
    };

    const finishWithResult = async (data: AnalyzeResult, activeFiles: UploadFiles) => {
      let resolved = data;
      const sid = data.statement_id?.trim();
      if (sid) {
        try {
          resolved = await fetchSavedReportWithRetry(sid);
        } catch {
          /* keep inline SSE payload when fetch fails */
        }
      }

      setFilesState(activeFiles);
      setResult(resolved);
      markJustAnalyzed();
      setStatementDuplicate(null);
      setError(null);
      setUploadMismatch(null);

      if (isAuth && user?.userId) {
        const preview = buildAtLetterPreview(resolved, user, {
          statementId: resolved.statement_id ?? undefined,
          hasPdf: Boolean(resolved.statement_id || (resolved.report?.channels?.length ?? 0) > 0),
        });
        if (preview?.mode === 'live') {
          saveAtLetterCache(user.userId, preview);
        } else if (resolved.statement_id) {
          markUserHasSavedLetter(user.userId);
        }
        window.dispatchEvent(new CustomEvent(LETTER_UPDATED_EVENT));
        window.dispatchEvent(new CustomEvent(REPORT_HISTORY_REFRESH_EVENT));
      }

      if (resolved.statement_id) {
        await Promise.all([
          prefetchAtLetterHtml(resolved.statement_id, { monthOnly: true }),
          prefetchAtLetterHtml(resolved.statement_id, { monthOnly: false }),
        ]);
      }

      if (progressStarted) {
        setAnalyzeProgress(null);
      }

      return resolved;
    };

    try {
      const data = await analyzeWithProgress(active, (event) => {
        ensureProgress();
        const sid = statementIdFromProgressEvent(event);
        if (sid) {
          lastStreamStatementIdRef.current = sid;
          setLastStreamStatementId(sid);
        }
        setAnalyzeProgress((prev) => (prev ? applyPipelineEvent(prev, event) : prev));
      }, options);

      return await finishWithResult(data, active);
    } catch (err) {
      clearPipelineWaiters();

      const duplicate = extractStatementDuplicate(err);
      if (duplicate) {
        if (progressStarted) setAnalyzeProgress(null);
        setStatementDuplicate(duplicate);
        setUploadMismatch(null);
        setError(null);
        return null;
      }

      if (progressStarted) {
        const sid = lastStreamStatementIdRef.current;
        if (sid) {
          try {
            const loaded = await fetchSavedReportWithRetry(sid);
            return await finishWithResult(loaded, active);
          } catch {
            /* fall through — history recovery below */
          }
        }
        const recovered = await recoverSavedAnalyzeFromHistory();
        if (recovered) {
          return await finishWithResult(recovered, active);
        }
        setAnalyzeProgress(null);
      }

      const mismatch = extractUploadMismatches(err);
      if (mismatch) {
        setUploadMismatch(mismatch);
        setStatementDuplicate(null);
        setError(null);
      } else {
        setUploadMismatch(null);
        setError(getApiError(err, 'Analysis failed.'));
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [files, isAuth, user, waitForPipelineDisplay, clearPipelineWaiters]);

  const mergeWeekReports = useCallback((weekReports: WeekReportsViewApi) => {
    setResult((prev) => {
      if (!prev?.analysis) return prev;
      return {
        ...prev,
        analysis: { ...prev.analysis, week_reports: weekReports },
      };
    });
  }, []);

  const loadSavedReport = useCallback((saved: AnalyzeResult) => {
    setResult(saved);
    markJustAnalyzed();
    setError(null);
    setStatementDuplicate(null);
    setUploadMismatch(null);

    if (isAuth && user?.userId) {
      const preview = buildAtLetterPreview(saved, user, {
        statementId: saved.statement_id ?? undefined,
        hasPdf: Boolean(saved.statement_id || (saved.report?.channels?.length ?? 0) > 0),
      });
      if (preview?.mode === 'live') {
        saveAtLetterCache(user.userId, preview);
      } else if (saved.statement_id) {
        markUserHasSavedLetter(user.userId);
      }
      window.dispatchEvent(new CustomEvent(LETTER_UPDATED_EVENT));
      window.dispatchEvent(new CustomEvent(REPORT_HISTORY_REFRESH_EVENT));
    }

    if (saved.statement_id) {
      void prefetchAtLetterHtml(saved.statement_id, { monthOnly: true });
      void prefetchAtLetterHtml(saved.statement_id, { monthOnly: false });
    }
  }, [isAuth, user]);

  const clearResult = useCallback(() => {
    setResult(null);
  }, []);

  const value = useMemo(
    () => ({
      files,
      result,
      loading,
      analyzeProgress,
      error,
      uploadMismatch,
      statementDuplicate,
      setFiles,
      runAnalyze,
      applyStatementDuplicate,
      clearError,
      clearUploadMismatch,
      clearStatementDuplicate,
      mergeWeekReports,
      loadSavedReport,
      clearResult,
      lastStreamStatementId,
    }),
    [
      files,
      result,
      loading,
      analyzeProgress,
      error,
      uploadMismatch,
      statementDuplicate,
      setFiles,
      runAnalyze,
      applyStatementDuplicate,
      clearError,
      clearUploadMismatch,
      clearStatementDuplicate,
      mergeWeekReports,
      loadSavedReport,
      clearResult,
      lastStreamStatementId,
    ]
  );

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysis() {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error('useAnalysis must be used within AnalysisProvider');
  return ctx;
}

