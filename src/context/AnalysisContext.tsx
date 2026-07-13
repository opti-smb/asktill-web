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
  ensureAuthServiceReady,
  extractFreeTierLimit,
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
import {
  clearActiveStatementView,
  pinActiveStatementView,
} from '../lib/activeStatementView';
import { clearAtLetterHtmlCache, prefetchAtLetterHtml } from '../lib/atLetterHtmlCache';
import { markJustAnalyzed, clearJustAnalyzedGrace, REPORT_HISTORY_REFRESH_EVENT } from '../hooks/useReportSync';
import {
  applyPipelineEvent,
  buildInitialAnalyzeProgress,
  isPipelineDisplayComplete,
  PIPELINE_DISPLAY_TICK_COMPLETE_MS,
  PIPELINE_DISPLAY_TICK_MS,
  PIPELINE_DONE_HOLD_MS,
  shouldTickPipelineDisplay,
  tickPipelineDisplay,
  type AnalyzeProgressState,
} from '../lib/analyzeProgress';
import type { AnalyzeResult, WeekReportsViewApi } from '../lib/analyzeResponse';
import { getAnalyzeAnalysis } from '../lib/analyzeResponse';

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
  getLastStreamStatementId: () => string | null;
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
  const analyzeProgressRef = useRef<AnalyzeProgressState | null>(null);
  const lastStreamStatementIdRef = useRef<string | null>(null);
  const [lastStreamStatementId, setLastStreamStatementId] = useState<string | null>(null);

  useEffect(() => {
    analyzeProgressRef.current = analyzeProgress;
  }, [analyzeProgress]);

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
      if (analyzeProgressRef.current && isPipelineDisplayComplete(analyzeProgressRef.current)) {
        pipelineSafetyRef.current = window.setTimeout(() => {
          setAnalyzeProgress(null);
          resolve();
        }, PIPELINE_DONE_HOLD_MS);
        return;
      }
      if (analyzeProgressRef.current?.complete) {
        pipelineFinishRef.current = resolve;
        pipelineSafetyRef.current = window.setTimeout(() => {
          pipelineFinishRef.current = null;
          pipelineSafetyRef.current = null;
          setAnalyzeProgress(null);
          resolve();
        }, PIPELINE_DONE_HOLD_MS + 4000);
        return;
      }
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
    clearActiveStatementView();
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
    if (!analyzeProgress || !shouldTickPipelineDisplay(analyzeProgress)) {
      return undefined;
    }
    const delay = analyzeProgress.complete
      ? PIPELINE_DISPLAY_TICK_COMPLETE_MS
      : PIPELINE_DISPLAY_TICK_MS;
    const timer = window.setTimeout(() => {
      setAnalyzeProgress((prev) => {
        if (!prev) return prev;
        return tickPipelineDisplay(prev) ?? prev;
      });
    }, delay);
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

  const getLastStreamStatementId = useCallback(
    () => lastStreamStatementIdRef.current?.trim() || null,
    [],
  );

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
    clearAtLetterHtmlCache();
    // Keep prior pin until finishWithResult replaces it — clearing early lets
    // history sync jump to chronologically newest mid-upload.
    lastStreamStatementIdRef.current = null;
    setLastStreamStatementId(null);

    setAnalyzeProgress(buildInitialAnalyzeProgress());

    let inlineResult: AnalyzeResult | null = null;

    const finishWithResult = async (data: AnalyzeResult, activeFiles: UploadFiles) => {
      let resolved = data;
      const sid = data.statement_id?.trim();
      const hasPayload = Boolean(getAnalyzeAnalysis(data));
      if (sid && !hasPayload) {
        try {
          resolved = await fetchSavedReportWithRetry(sid);
        } catch {
          try {
            await ensureAuthServiceReady(45_000);
            resolved = await fetchSavedReportWithRetry(sid);
          } catch {
            /* keep statement_id so dashboard can recover via history sync */
            resolved = { ...data, statement_id: sid };
          }
        }
      }

      setFilesState(activeFiles);
      setResult(resolved);
      pinActiveStatementView(resolved.statement_id);
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
        // Defer history sync until after React commits the new analyze result.
        window.setTimeout(() => {
          window.dispatchEvent(new CustomEvent(REPORT_HISTORY_REFRESH_EVENT));
        }, 0);
      }

      if (resolved.statement_id) {
        void prefetchAtLetterHtml(resolved.statement_id, { monthOnly: false });
      }

      return resolved;
    };

    try {
      const data = await analyzeWithProgress(active, (event) => {
        const sid = statementIdFromProgressEvent(event);
        if (sid) {
          lastStreamStatementIdRef.current = sid;
          setLastStreamStatementId(sid);
          pinActiveStatementView(sid);
          if (event.stage === 'done' || event.stage === 'result') {
            void prefetchAtLetterHtml(sid, { monthOnly: true });
          }
        }
        if (event.stage === 'result' && event.result) {
          const payload = event.result as AnalyzeResult;
          if (getAnalyzeAnalysis(payload)) {
            inlineResult = payload;
            setAnalyzeProgress(null);
            return;
          }
        }
        setAnalyzeProgress((prev) => (prev ? applyPipelineEvent(prev, event) : prev));
      }, options);

      if (inlineResult && getAnalyzeAnalysis(inlineResult)) {
        clearPipelineWaiters();
        return await finishWithResult(inlineResult, active);
      }

      await waitForPipelineDisplay();
      return await finishWithResult(data, active);
    } catch (err) {
      clearPipelineWaiters();

      const duplicate = extractStatementDuplicate(err);
      if (duplicate) {
        setAnalyzeProgress(null);
        setStatementDuplicate(duplicate);
        setUploadMismatch(null);
        setError(null);
        return null;
      }

      const freeTierMessage = extractFreeTierLimit(err);
      if (freeTierMessage) {
        setAnalyzeProgress(null);
        setStatementDuplicate(null);
        setUploadMismatch(null);
        setError(freeTierMessage);
        return null;
      }

      const sid = lastStreamStatementIdRef.current;
      if (sid) {
        try {
          const loaded = await fetchSavedReportWithRetry(sid);
          await waitForPipelineDisplay();
          return await finishWithResult(loaded, active);
        } catch {
          /* fall through — history recovery below */
        }
      }
      const recovered = await recoverSavedAnalyzeFromHistory();
      if (recovered) {
        await waitForPipelineDisplay();
        return await finishWithResult(recovered, active);
      }
      setAnalyzeProgress(null);

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
    pinActiveStatementView(saved.statement_id);
    markJustAnalyzed();
    setError(null);
    setStatementDuplicate(null);
    setUploadMismatch(null);
    clearAtLetterHtmlCache();

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
      getLastStreamStatementId,
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
      getLastStreamStatementId,
    ]
  );

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysis() {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error('useAnalysis must be used within AnalysisProvider');
  return ctx;
}

