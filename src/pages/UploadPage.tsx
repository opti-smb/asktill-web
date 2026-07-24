import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from '../components/common/Logo';
import UserAccountMenu from '../components/layout/UserAccountMenu';
import FileDropZone from '../components/upload/FileDropZone';
import AnalyzeProgressOverlay from '../components/upload/AnalyzeProgressOverlay';
import UploadContinuityNudge from '../components/upload/UploadContinuityNudge';
import PostPaymentSignInModal, {
  isPostPaymentSignInRequired,
} from '../components/upload/PostPaymentSignInModal';
import PreviousReportsPanel from '../components/analysis/PreviousReportsPanel';
import { useAnalysis } from '../context/AnalysisContext';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import {
  duplicateInfoFromValidation,
  downloadMonthlyReportPdf,
  fetchReportHistory,
  fetchSavedReport,
  freeTierLimitNotice,
  getApiError,
  getApiErrorAsync,
  hasFreeTierLimitConflict,
  isAlreadyStoredMessage,
  hasStoredPeriodConflict,
  storedPeriodMessage,
  validationSettledForFiles,
  USER_STATE_RESET_EVENT,
  batchValidationPasses,
  mergeUploadValidationResults,
  periodLabelFromFilename,
  validateUploadsWithRetry,
  ensureAuthServiceReady,
  ensureBackendServiceReady,
  wasBackendRecentlyPrimed,
  warmupBackend,
  warningsBySlot,
  type FreeTierLimitNotice,
  type UploadValidationResult,
} from '../lib/api';
import { downloadPdfWithSaveDialog, filenameFromDisposition } from '../lib/downloadReport';
import { pickMostRecentlyUploadedReport } from '../lib/atLetterStatement';
import { getAnalyzeAnalysis } from '../lib/analyzeResponse';
import { prefetchAtLetterHtml } from '../lib/atLetterHtmlCache';
import type { FileUploadState } from '../types';
import { DEFAULT_DASHBOARD_PATH } from '../lib/pendingPdfDownload';
import {
  shouldShowContinuityNudge,
  type UploadContinuityView,
} from '../lib/uploadContinuity';
import styles from './UploadPage.module.css';

type FormData = Record<string, FileList>;
type UploadSlot = 'bank' | 'pos' | 'ecommerce';

type PinnedSlotWarning = { fileKey: string; message: string };

const steps = [
  { label: 'Account', status: 'done' },
  { label: 'Upload data', status: 'active' },
  { label: 'Confirm sources', status: '' },
  { label: 'First insight', status: '' },
];

function fileFromList(list: FileList | undefined): File | undefined {
  return list?.[0];
}

function resolveSlotWarnings(
  validation: UploadValidationResult | null,
  pinned: Partial<Record<UploadSlot, PinnedSlotWarning | null>>,
  fileKeys: Record<UploadSlot, string>,
): ReturnType<typeof warningsBySlot> {
  const server = warningsBySlot(validation);
  const out = { bank: '', pos: '', ecommerce: '' };
  for (const slot of ['bank', 'pos', 'ecommerce'] as const) {
    if (!fileKeys[slot]) continue;
    const fromServer = server[slot]?.trim();
    if (fromServer) {
      out[slot] = fromServer;
      continue;
    }
    const pin = pinned[slot];
    if (pin?.fileKey === fileKeys[slot] && pin.message?.trim()) {
      out[slot] = pin.message.trim();
    }
  }
  return out;
}

function uploadStateFromFile(
  file: File | undefined,
  slot: UploadSlot,
  validation: UploadValidationResult | null,
  slotWarnings: ReturnType<typeof warningsBySlot>,
  checking: boolean,
  validationFailed: boolean,
  verifyErrorMessage?: string | null,
  validationCurrent: boolean = true,
): FileUploadState {
  if (!file) return { uploaded: false };
  const period = validation?.detected_periods?.[slot];
  const filenamePeriod = periodLabelFromFilename(file.name);
  const size = `${Math.round(file.size / 1024)} KB`;
  const slotWarning = slotWarnings[slot]?.trim() || undefined;

  if (slotWarning) {
    return {
      uploaded: true,
      checking: false,
      status: 'warning',
      fileName: file.name,
      sizeLabel: size,
      periodLabel: period ?? filenamePeriod ?? null,
      statusLine: 'Wrong file or month',
      issueKind: 'slot',
      warning: slotWarning,
      detail: `${size}${period ?? filenamePeriod ? ` · ${period ?? filenamePeriod}` : ''}`,
    };
  }

  if (checking) {
    return {
      uploaded: true,
      checking: true,
      status: 'checking',
      fileName: file.name,
      sizeLabel: size,
      periodLabel: filenamePeriod,
      statusLine: filenamePeriod
        ? `Likely ${filenamePeriod} — uploading & confirming…`
        : 'Uploading file and checking statement month…',
      detail: filenamePeriod
        ? `${size} · ${filenamePeriod} · verifying…`
        : `${size} · uploading & verifying…`,
    };
  }

  if (validationFailed) {
    return {
      uploaded: true,
      checking: false,
      status: 'verify-error',
      fileName: file.name,
      sizeLabel: size,
      periodLabel: filenamePeriod,
      statusLine: 'Verification delayed',
      issueKind: 'verify',
      warning:
        verifyErrorMessage?.trim() ||
        'Verification is taking longer than usual. Your file is kept — tap Retry below.',
      detail: `${size} · verification delayed`,
    };
  }

  // File changed but validate request not started yet (debounce) — don't show Ready.
  if (!validationCurrent) {
    return {
      uploaded: true,
      checking: true,
      status: 'checking',
      fileName: file.name,
      sizeLabel: size,
      periodLabel: filenamePeriod,
      statusLine: filenamePeriod
        ? `Likely ${filenamePeriod} — waiting to verify…`
        : 'Waiting to verify file type & month…',
      detail: filenamePeriod
        ? `${size} · ${filenamePeriod} · queued…`
        : `${size} · queued…`,
    };
  }

  const confirmedPeriod = period ?? filenamePeriod ?? null;
  return {
    uploaded: true,
    checking: false,
    status: 'verified',
    fileName: file.name,
    sizeLabel: size,
    periodLabel: confirmedPeriod,
    statusLine: confirmedPeriod ? `Ready · ${confirmedPeriod}` : 'Ready to analyze',
    detail: confirmedPeriod ? `${size} · ${confirmedPeriod}` : size,
  };
}

function syncPinnedSlotWarnings(
  prev: Partial<Record<UploadSlot, PinnedSlotWarning | null>>,
  validation: UploadValidationResult,
  fileKeys: Record<UploadSlot, string>,
): Partial<Record<UploadSlot, PinnedSlotWarning | null>> {
  const next: Partial<Record<UploadSlot, PinnedSlotWarning | null>> = { ...prev };
  for (const slot of ['bank', 'pos', 'ecommerce'] as const) {
    const key = fileKeys[slot];
    if (!key) {
      next[slot] = null;
      continue;
    }
    const message = warningsBySlot(validation)[slot]?.trim();
    const prior = prev[slot]?.fileKey === key ? prev[slot] : null;

    if (message) {
      next[slot] = { fileKey: key, message };
    } else if (batchValidationPasses(validation)) {
      next[slot] = null;
    } else if (prior?.message) {
      next[slot] = prior;
    } else {
      next[slot] = null;
    }
  }
  return next;
}

function fileKey(file: File | undefined): string {
  return file ? `${file.name}:${file.size}:${file.lastModified}` : '';
}

export default function UploadPage({ embedded = false }: { embedded?: boolean }) {
  const { register, watch, reset: resetForm } = useForm<FormData>();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    runAnalyze,
    loading,
    analyzeProgress,
    error,
    uploadMismatch,
    statementDuplicate,
    applyStatementDuplicate,
    clearError,
    clearUploadMismatch,
    clearStatementDuplicate,
    loadSavedReport,
    lastStreamStatementId,
    getLastStreamStatementId,
    setFiles,
  } = useAnalysis();
  const { isAuth, ready: authReady } = useAuth();
  const { isPaid } = useSubscription();
  const [needPostPaymentSignIn, setNeedPostPaymentSignIn] = useState(() =>
    isPostPaymentSignInRequired(),
  );

  useEffect(() => {
    if (isPostPaymentSignInRequired()) {
      setNeedPostPaymentSignIn(true);
    }
  }, []);

  useEffect(() => {
    if (isPaid) {
      setPersistentFreeTierNotice(null);
    }
  }, [isPaid]);

  const goToPricing = useCallback(() => {
    const from = encodeURIComponent(location.pathname);
    navigate(`/pricing?from=${from}`);
  }, [location.pathname, navigate]);
  const [showPreviousReports, setShowPreviousReports] = useState(false);
  const [savedReportCount, setSavedReportCount] = useState<number | null>(null);
  const [duplicateBusy, setDuplicateBusy] = useState(false);
  const [validation, setValidation] = useState<UploadValidationResult | null>(null);
  const [pinnedSlotWarnings, setPinnedSlotWarnings] = useState<
    Partial<Record<UploadSlot, PinnedSlotWarning | null>>
  >({});
  const [slotChecking, setSlotChecking] = useState<Record<UploadSlot, boolean>>({
    bank: false,
    pos: false,
    ecommerce: false,
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationRetryKey, setValidationRetryKey] = useState(0);
  const [uploadPrompt, setUploadPrompt] = useState<string | null>(null);
  const [continuityDismissed, setContinuityDismissed] = useState(false);
  const [postAnalyzeContinuity, setPostAnalyzeContinuity] = useState<UploadContinuityView | null>(
    null,
  );
  const [persistentFreeTierNotice, setPersistentFreeTierNotice] =
    useState<FreeTierLimitNotice | null>(null);
  const [uploadFormKey, setUploadFormKey] = useState(0);
  const validatedFileKeysRef = useRef('');
  const validationRequestRef = useRef(0);
  const uploadFilesRef = useRef<{ bank?: File; pos?: File; ecommerce?: File }>({});

  const rejectFreeTierUpload = useCallback(
    (notice: FreeTierLimitNotice | null) => {
      if (isPaid) return;
      if (notice) setPersistentFreeTierNotice(notice);
      validationRequestRef.current += 1;
      setValidation(null);
      setPinnedSlotWarnings({});
      validatedFileKeysRef.current = '';
      setSlotChecking({ bank: false, pos: false, ecommerce: false });
      resetForm({ bank: undefined, pos: undefined, ecommerce: undefined });
      setUploadFormKey((key) => key + 1);
    },
    [resetForm, isPaid],
  );

  useEffect(() => {
    // Backend verifies JWT locally — only wake backend for upload validate.
    void ensureBackendServiceReady(45_000);
  }, []);

  const openSavedReport = useCallback(
    async (statementId: string) => {
      setDuplicateBusy(true);
      try {
        const { data } = await fetchSavedReport(statementId);
        loadSavedReport(data);
        clearStatementDuplicate();
        navigate(DEFAULT_DASHBOARD_PATH);
      } catch (err) {
        setUploadPrompt(await getApiErrorAsync(err, 'Could not open saved report.'));
      } finally {
        setDuplicateBusy(false);
      }
    },
    [loadSavedReport, navigate, clearStatementDuplicate],
  );

  const downloadSavedPdf = useCallback(async (statementId: string, periodLabel?: string | null) => {
    setDuplicateBusy(true);
    const label = periodLabel?.replace(/\s+/g, '_') ?? 'Report';
    const fallbackName = `${label}_Reconciliation.pdf`;
    try {
      await downloadPdfWithSaveDialog({
        suggestedFilename: fallbackName,
        prebuilt: true,
        fetchBlob: async () => {
          const { data, headers } = await downloadMonthlyReportPdf(statementId);
          const filename = filenameFromDisposition(
            headers['content-disposition'] as string | undefined,
            fallbackName,
          );
          return new File([data], filename, { type: 'application/pdf' });
        },
      });
    } catch (err) {
      setUploadPrompt(await getApiErrorAsync(err, 'Could not download PDF.'));
    } finally {
      setDuplicateBusy(false);
    }
  }, []);

  const resetUploadPage = useCallback(() => {
    resetForm({ bank: undefined, pos: undefined, ecommerce: undefined });
    setValidation(null);
    setPinnedSlotWarnings({});
    setSlotChecking({ bank: false, pos: false, ecommerce: false });
    setValidationError(null);
    setUploadPrompt(null);
    setContinuityDismissed(false);
    setPostAnalyzeContinuity(null);
    setPersistentFreeTierNotice(null);
    setUploadFormKey((key) => key + 1);
    validatedFileKeysRef.current = '';
    validationRequestRef.current += 1;
  }, [resetForm]);

  useEffect(() => {
    const onReset = () => resetUploadPage();
    window.addEventListener(USER_STATE_RESET_EVENT, onReset);
    return () => window.removeEventListener(USER_STATE_RESET_EVENT, onReset);
  }, [resetUploadPage]);

  const bankFile = fileFromList(watch('bank'));
  const posFile = fileFromList(watch('pos'));
  const ecommerceFile = fileFromList(watch('ecommerce'));
  const bankKey = fileKey(bankFile);
  const posKey = fileKey(posFile);
  const ecommerceKey = fileKey(ecommerceFile);
  uploadFilesRef.current = {
    bank: bankFile,
    pos: posFile,
    ecommerce: ecommerceFile,
  };
  const uploadedCount = [bankFile, posFile, ecommerceFile].filter(Boolean).length;
  const currentFileKeys = `${bankKey}|${posKey}|${ecommerceKey}`;

  // Keep Ask drawer in sync with AT Uploads slot files (no re-upload in chat).
  useEffect(() => {
    setFiles({
      bank: bankFile,
      pos: posFile,
      ecommerce: ecommerceFile,
    });
  }, [bankKey, posKey, ecommerceKey, bankFile, posFile, ecommerceFile, setFiles]);

  useEffect(() => {
    clearUploadMismatch();
    clearStatementDuplicate();
    if (uploadedCount > 0) setUploadPrompt(null);
    setContinuityDismissed(false);
    setPostAnalyzeContinuity(null);
    setPinnedSlotWarnings((prev) => ({
      bank: prev.bank?.fileKey === bankKey ? prev.bank : null,
      pos: prev.pos?.fileKey === posKey ? prev.pos : null,
      ecommerce: prev.ecommerce?.fileKey === ecommerceKey ? prev.ecommerce : null,
    }));
  }, [bankKey, posKey, ecommerceKey, uploadedCount, clearUploadMismatch, clearStatementDuplicate]);

  const anySlotChecking = slotChecking.bank || slotChecking.pos || slotChecking.ecommerce;

  useEffect(() => {
    if (!authReady || !isAuth) {
      setSavedReportCount(isAuth ? null : 0);
      return undefined;
    }
    // Defer history until uploads are idle — competing with validate on free Render
    // makes the first post-payment check feel stuck.
    if (anySlotChecking) return undefined;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      fetchReportHistory()
        .then(({ data }) => {
          if (!cancelled) setSavedReportCount((data.reports ?? []).length);
        })
        .catch(() => {
          if (!cancelled) setSavedReportCount(null);
        });
    }, 800);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [authReady, isAuth, anySlotChecking]);

  useEffect(() => {
    if (needPostPaymentSignIn) {
      setSlotChecking({ bank: false, pos: false, ecommerce: false });
      return undefined;
    }
    if (uploadedCount < 1) {
      setValidation(null);
      setPinnedSlotWarnings({});
      setValidationError(null);
      validatedFileKeysRef.current = '';
      setSlotChecking({ bank: false, pos: false, ecommerce: false });
      return undefined;
    }

    const fileKeysAtStart = currentFileKeys;
    let cancelled = false;
    const requestId = ++validationRequestRef.current;

    setSlotChecking({
      bank: false,
      pos: false,
      ecommerce: false,
    });
    setValidationError(null);
    // Warm in background; validateUploadsWithRetry also waits for auth + backend.

    // Debounce so picking bank/pos/ecom quickly only validates once (prod parse is slow).
    // Do not flip checking=true until the request actually starts — otherwise the UI
    // claims "Opening file…" during idle debounce time.
    const timer = window.setTimeout(() => {
      void (async () => {
        if (cancelled || validationRequestRef.current !== requestId) return;
        // Wake backend BEFORE showing "Uploading…" (skip long wait if activating just primed).
        if (!wasBackendRecentlyPrimed()) {
          await ensureBackendServiceReady(90_000);
        }
        if (cancelled || validationRequestRef.current !== requestId) return;
        if (fileKeysAtStart !== `${bankKey}|${posKey}|${ecommerceKey}`) return;

        setSlotChecking({
          bank: Boolean(bankKey),
          pos: Boolean(posKey),
          ecommerce: Boolean(ecommerceKey),
        });
        try {
          const files = uploadFilesRef.current;
          const { data } = await validateUploadsWithRetry({
            bank: files.bank,
            pos: files.pos,
            ecommerce: files.ecommerce,
          });
          if (cancelled || validationRequestRef.current !== requestId) return;
          if (fileKeysAtStart !== `${bankKey}|${posKey}|${ecommerceKey}`) return;

          if (hasFreeTierLimitConflict(data)) {
            rejectFreeTierUpload(freeTierLimitNotice(data));
            return;
          }

          setValidation(data);
          validatedFileKeysRef.current = fileKeysAtStart;
          setPinnedSlotWarnings((prev) =>
            syncPinnedSlotWarnings(prev, data, {
              bank: bankKey,
              pos: posKey,
              ecommerce: ecommerceKey,
            }),
          );
          if (hasStoredPeriodConflict(data)) {
            const dup = duplicateInfoFromValidation(data);
            if (dup) applyStatementDuplicate(dup);
          } else {
            clearStatementDuplicate();
          }
        } catch (err) {
          if (cancelled || validationRequestRef.current !== requestId) return;
          if (fileKeysAtStart !== `${bankKey}|${posKey}|${ecommerceKey}`) return;
          setValidationError(
            getApiError(
              err,
              'Upload check is taking longer than usual. Your file is still selected — tap Retry.',
            ),
          );
        } finally {
          if (!cancelled && validationRequestRef.current === requestId) {
            setSlotChecking({ bank: false, pos: false, ecommerce: false });
          }
        }
      })();
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    needPostPaymentSignIn,
    bankKey,
    posKey,
    ecommerceKey,
    uploadedCount,
    currentFileKeys,
    validationRetryKey,
    applyStatementDuplicate,
    clearStatementDuplicate,
    rejectFreeTierUpload,
  ]);

  const validationMatchesFiles = validatedFileKeysRef.current === currentFileKeys;
  const mergedValidation = useMemo(
    () => mergeUploadValidationResults(validation, uploadMismatch),
    [validation, uploadMismatch],
  );
  const activeValidation = mergedValidation;

  useEffect(() => {
    if (!uploadMismatch) return;
    setPinnedSlotWarnings((prev) =>
      syncPinnedSlotWarnings(prev, uploadMismatch, {
        bank: bankKey,
        pos: posKey,
        ecommerce: ecommerceKey,
      }),
    );
  }, [uploadMismatch, bankKey, posKey, ecommerceKey]);

  useEffect(() => {
    if (!validationMatchesFiles || anySlotChecking || validationError) return;
    if (!hasFreeTierLimitConflict(mergedValidation)) {
      if (mergedValidation && batchValidationPasses(mergedValidation)) {
        setPersistentFreeTierNotice(null);
      }
      return;
    }
    rejectFreeTierUpload(freeTierLimitNotice(mergedValidation));
  }, [
    validationMatchesFiles,
    anySlotChecking,
    validationError,
    mergedValidation,
    rejectFreeTierUpload,
  ]);

  const slotFileKeys = useMemo(
    () => ({ bank: bankKey, pos: posKey, ecommerce: ecommerceKey }),
    [bankKey, posKey, ecommerceKey],
  );
  const slotWarnings = useMemo(
    () => resolveSlotWarnings(activeValidation, pinnedSlotWarnings, slotFileKeys),
    [activeValidation, pinnedSlotWarnings, slotFileKeys],
  );
  const hasBoxWarnings = Boolean(slotWarnings.bank || slotWarnings.pos || slotWarnings.ecommerce);

  const validationFailed = Boolean(validationError);
  const bankState = useMemo(
    () =>
      uploadStateFromFile(
        bankFile,
        'bank',
        activeValidation,
        slotWarnings,
        slotChecking.bank,
        validationFailed,
        validationError,
        validationMatchesFiles,
      ),
    [bankFile, activeValidation, slotWarnings, slotChecking.bank, validationFailed, validationError, validationMatchesFiles],
  );
  const posState = useMemo(
    () =>
      uploadStateFromFile(
        posFile,
        'pos',
        activeValidation,
        slotWarnings,
        slotChecking.pos,
        validationFailed,
        validationError,
        validationMatchesFiles,
      ),
    [posFile, activeValidation, slotWarnings, slotChecking.pos, validationFailed, validationError, validationMatchesFiles],
  );
  const ecommerceState = useMemo(
    () =>
      uploadStateFromFile(
        ecommerceFile,
        'ecommerce',
        activeValidation,
        slotWarnings,
        slotChecking.ecommerce,
        validationFailed,
        validationError,
        validationMatchesFiles,
      ),
    [
      ecommerceFile,
      activeValidation,
      slotWarnings,
      slotChecking.ecommerce,
      validationFailed,
      validationError,
      validationMatchesFiles,
    ],
  );

  const freeTierNotice = useMemo(() => {
    if (isPaid) return null;
    if (persistentFreeTierNotice) return persistentFreeTierNotice;
    if (!validationMatchesFiles || anySlotChecking) return null;
    const fromValidation = freeTierLimitNotice(mergedValidation);
    if (fromValidation) return fromValidation;
    if (error && (error.toLowerCase().includes('free plan') || error.toLowerCase().includes('upgrade to add'))) {
      return { storedLabel: null, newLabel: null, message: error };
    }
    return null;
  }, [isPaid, persistentFreeTierNotice, mergedValidation, error, validationMatchesFiles, anySlotChecking]);

  const headerNotice = useMemo(() => {
    if (freeTierNotice) return null;
    if (statementDuplicate?.message) {
      return statementDuplicate.message;
    }
    if (!validationMatchesFiles || anySlotChecking) return null;
    const fromValidation = storedPeriodMessage(mergedValidation);
    if (fromValidation) return fromValidation;
    if (error && isAlreadyStoredMessage(error)) return error;
    return null;
  }, [freeTierNotice, statementDuplicate, mergedValidation, error, validationMatchesFiles, anySlotChecking]);

  const savedStatementId = useMemo(() => {
    if (statementDuplicate?.statementId) return statementDuplicate.statementId;
    return mergedValidation?.stored_period_warnings?.find((w) => w.statement_id)?.statement_id ?? null;
  }, [statementDuplicate, mergedValidation]);

  const savedPeriodLabel = useMemo(
    () =>
      statementDuplicate?.periodLabel
      ?? mergedValidation?.stored_period_warnings?.find((w) => w.period_label)?.period_label
      ?? null,
    [statementDuplicate, mergedValidation],
  );

  useEffect(() => {
    if (!savedStatementId?.trim()) return;
    void prefetchAtLetterHtml(savedStatementId, { monthOnly: true });
    void prefetchAtLetterHtml(savedStatementId, { monthOnly: false });
    void fetchSavedReport(savedStatementId).catch(() => undefined);
  }, [savedStatementId]);

  const validationSettled = validationSettledForFiles(
    validation,
    validatedFileKeysRef.current === currentFileKeys,
    anySlotChecking,
    Boolean(validationError),
  );
  const hasStoredConflict =
    validationSettled &&
    (Boolean(statementDuplicate) || hasStoredPeriodConflict(mergedValidation));
  const canOpenSavedReport =
    Boolean(savedStatementId)
    && (hasStoredConflict || Boolean(statementDuplicate));
  const validationReady =
    validation != null &&
    batchValidationPasses(validation) &&
    !validationError &&
    validatedFileKeysRef.current === currentFileKeys;
  const hasFreeTierConflict =
    !isPaid
    && (
      Boolean(persistentFreeTierNotice)
      || (validationSettled && hasFreeTierLimitConflict(mergedValidation))
    );
  const canSubmitAnalyze =
    uploadedCount >= 1 &&
    !loading &&
    !anySlotChecking &&
    !validationError &&
    !hasStoredConflict &&
    !hasFreeTierConflict &&
    !hasBoxWarnings &&
    validationReady;

  const validationContinuity = activeValidation?.upload_continuity ?? null;
  const showValidationContinuityNudge =
    validationSettled &&
    !postAnalyzeContinuity &&
    !continuityDismissed &&
    shouldShowContinuityNudge(validationContinuity);

  const goToDashboard = useCallback(() => {
    navigate(DEFAULT_DASHBOARD_PATH);
  }, [navigate]);

  const dismissContinuityNudge = useCallback(() => {
    setContinuityDismissed(true);
    setPostAnalyzeContinuity(null);
  }, []);

  useEffect(() => {
    if (headerNotice && error && isAlreadyStoredMessage(error)) {
      clearError();
    }
  }, [headerNotice, error, clearError]);

  const onContinue = async (force = false) => {
    if (loading || anySlotChecking || uploadedCount < 1) return;
    if (!force && hasStoredConflict) return;
    if (!force && !validationReady) {
      if (uploadedCount >= 1 && hasBoxWarnings) {
        setUploadPrompt(
          'Fix the highlighted upload issues (wrong file type, month mismatch, or duplicate month) before continuing.',
        );
      }
      return;
    }
    if (force && !validationSettled) return;

    clearError();
    clearUploadMismatch();
    setUploadPrompt(null);

    const reportsBefore = savedReportCount ?? 0;
    const result = await runAnalyze({
      bank: bankFile,
      pos: posFile,
      ecommerce: ecommerceFile,
    }, force ? { force: true } : undefined);
    if (result && (getAnalyzeAnalysis(result) || result.statement_id)) {
      const continuity = getAnalyzeAnalysis(result)?.upload_continuity ?? null;
      if (shouldShowContinuityNudge(continuity)) {
        setPostAnalyzeContinuity(continuity);
        setContinuityDismissed(false);
        return;
      }
      goToDashboard();
      return;
    }

    const streamId = getLastStreamStatementId() ?? lastStreamStatementId?.trim();
    if (streamId) {
      try {
        const { ensureAuthServiceReady } = await import('../lib/api');
        await ensureAuthServiceReady(45_000);
        await openSavedReport(streamId);
        return;
      } catch {
        /* fall through — history recovery below */
      }
    }

    if (isAuth) {
      try {
        warmupBackend();
        await ensureAuthServiceReady(30_000);
        const { data } = await fetchReportHistory();
        const count = data.reports?.length ?? 0;
        setSavedReportCount(count);
        const recent = pickMostRecentlyUploadedReport(data.reports ?? []);
        const latestId = recent?.statement_id;
        if (latestId && (streamId || count > reportsBefore || force)) {
          await openSavedReport(streamId ?? latestId);
          return;
        }
      } catch {
        /* fall through — show analyze error below */
      }
    }

    if (uploadMismatch) {
      setUploadPrompt(
        'Fix the highlighted upload issues (wrong file type, month mismatch, or duplicate month) before continuing.',
      );
    }
  };

  return (
    <div className={`${styles.pageBg} ${embedded ? styles.pageBgEmbedded : ''}`}>
      <PostPaymentSignInModal
        open={needPostPaymentSignIn}
        onActivated={() => setNeedPostPaymentSignIn(false)}
      />
      {analyzeProgress && <AnalyzeProgressOverlay progress={analyzeProgress} />}
      {showValidationContinuityNudge && validationContinuity ? (
        <UploadContinuityNudge
          continuity={validationContinuity}
          onDismiss={dismissContinuityNudge}
        />
      ) : null}
      {postAnalyzeContinuity ? (
        <UploadContinuityNudge
          continuity={postAnalyzeContinuity}
          onDismiss={dismissContinuityNudge}
          onContinue={goToDashboard}
        />
      ) : null}
      {!embedded ? (
      <nav className={styles.nav}>
        <div className="wrap">
          <div className={styles.navInner}>
            <Logo to={DEFAULT_DASHBOARD_PATH} />
            <UserAccountMenu showName />
          </div>
        </div>
      </nav>
      ) : null}

      <div className={styles.stepper}>
        <div className="wrap">
          <div className={styles.stepperInner}>
            {steps.map((step, i) => (
              <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                {i > 0 && <div className={styles.stepDivider} />}
                <div className={`${styles.stepPill} ${step.status ? styles[step.status] : ''}`}>
                  <span className={styles.stepNum}>
                    {step.status === 'done' ? '✓' : i + 1}
                  </span>
                  <span className={styles.stepLabel}>{step.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.page}>
        <div
          className={`wrap ${styles.pageInner} ${embedded ? styles.pageInnerEmbedded : ''} ${
            showPreviousReports ? styles.pageInnerScroll : ''
          }`}
        >
          <div className={styles.previousReportsTop}>
            <button
              type="button"
              className={styles.btnPreviousReports}
              onClick={() => setShowPreviousReports((open) => !open)}
              aria-expanded={showPreviousReports}
            >
              {showPreviousReports ? 'Hide' : 'View'} your previous reconciliation reports
              {savedReportCount != null && savedReportCount > 0 ? ` (${savedReportCount})` : ''}
            </button>
          </div>

          {showPreviousReports && (
            <div className={styles.previousReportsDrawer}>
              <PreviousReportsPanel
                active
                variant="upload"
                onLoadReport={loadSavedReport}
                onReportsLoaded={setSavedReportCount}
              />
            </div>
          )}

          <div className={styles.pageHeader}>
            <span className={styles.pageEyebrow}>Step 2 of 4</span>
            <h1>All your statements in <em>1 page</em></h1>
            <p className={styles.pageSub}>
              Upload your Bank, Pos, and Ecom statements. Same period will give best results
            </p>
            {freeTierNotice ? (
              <div className={styles.freeTierBanner} role="alert">
                <p className={styles.freeTierTitle}>Free plan: one month on file</p>
                <p className={styles.freeTierMessage}>{freeTierNotice.message}</p>
                <button
                  type="button"
                  className={styles.freeTierUpgradeBtn}
                  onClick={goToPricing}
                >
                  Upgrade to Paid
                </button>
              </div>
            ) : headerNotice ? (
              <div className={styles.duplicateBanner} role="alert">
                <p className={styles.duplicateMessage}>{headerNotice}</p>
                {savedStatementId ? (
                  <div className={styles.duplicateActions}>
                    <button
                      type="button"
                      className={styles.btnDuplicateAction}
                      disabled={duplicateBusy}
                      onClick={() => void openSavedReport(savedStatementId)}
                    >
                      Open saved dashboard
                    </button>
                    <button
                      type="button"
                      className={styles.btnDuplicateAction}
                      disabled={duplicateBusy}
                      onClick={() => void downloadSavedPdf(savedStatementId, savedPeriodLabel)}
                    >
                      Download PDF
                    </button>
                    <button
                      type="button"
                      className={styles.btnDuplicateAction}
                      disabled={duplicateBusy || loading}
                      onClick={() => void onContinue(true)}
                    >
                      Replace and re-analyze
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={styles.btnDuplicateLink}
                    onClick={() => setShowPreviousReports(true)}
                  >
                    View previous reports
                  </button>
                )}
              </div>
            ) : null}
          </div>

          <div className={styles.uploadGrid}>
            <FileDropZone
              key={`bank-${uploadFormKey}`}
              name="bank"
              label="Bank statement"
              uploadState={bankState}
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="22" x2="21" y2="22" />
                  <line x1="6" y1="18" x2="6" y2="11" />
                  <line x1="10" y1="18" x2="10" y2="11" />
                  <line x1="14" y1="18" x2="14" y2="11" />
                  <line x1="18" y1="18" x2="18" y2="11" />
                  <polygon points="12 2 22 7 2 7" />
                </svg>
              }
              register={register}
            />
            <FileDropZone
              key={`pos-${uploadFormKey}`}
              name="pos"
              label="POS export"
              uploadState={posState}
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="7" y="2" width="10" height="6" rx="1" />
                  <line x1="9" y1="5" x2="15" y2="5" />
                  <rect x="4" y="9" width="16" height="12" rx="2" />
                  <line x1="8" y1="13" x2="16" y2="13" />
                  <line x1="8" y1="17" x2="13" y2="17" />
                </svg>
              }
              register={register}
            />
            <FileDropZone
              key={`ecommerce-${uploadFormKey}`}
              name="ecommerce"
              label="Ecommerce"
              uploadState={ecommerceState}
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
                </svg>
              }
              register={register}
            />
          </div>

          <div className={styles.privacy}>
            <div className={styles.privacyIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div className={styles.privacyText}>
              <strong>Your data stays encrypted.</strong> Encrypted at rest and in transit. Personal details (account numbers, customer names) are tokenized before analysis — our team never sees them in the clear.
            </div>
          </div>

          {validationError && (
            <div className={styles.micro} style={{ color: 'var(--neg)', marginBottom: 12 }}>
              <div>{validationError}</div>
              <button
                type="button"
                className={styles.retryBtn}
                disabled={anySlotChecking}
                onClick={() => {
                  setValidationError(null);
                  setValidationRetryKey((n) => n + 1);
                }}
                style={{ marginTop: 8 }}
              >
                {anySlotChecking ? 'Retrying…' : 'Retry verification'}
              </button>
            </div>
          )}

          {uploadPrompt && (
            <div className={styles.uploadPrompt} role="alert">
              <strong>Upload required</strong>
              {uploadPrompt}
            </div>
          )}

          {error && !headerNotice && !freeTierNotice && !hasBoxWarnings && !isAlreadyStoredMessage(error) && (
            <div className={styles.micro} style={{ color: 'var(--neg)', marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div className={styles.ctaWrap}>
            {canOpenSavedReport ? (
              <button
                type="button"
                className={styles.btnPrimary}
                disabled={duplicateBusy || loading}
                onClick={() => void openSavedReport(savedStatementId!)}
              >
                Open saved dashboard
                <span>→</span>
              </button>
            ) : (
              <button
                type="button"
                className={styles.btnPrimary}
                disabled={!canSubmitAnalyze}
                onClick={() => void onContinue()}
              >
                {loading ? 'Analyzing…' : 'Continue to dashboard'}
                <span>→</span>
              </button>
            )}
            <div className={styles.micro}>
              {uploadedCount} of 3 sources uploaded
              {loading
                ? ' · analyzing your statements'
                : uploadedCount < 1
                  ? ' · add at least one file to continue'
                  : anySlotChecking
                    ? ' · checking uploads'
                    : canOpenSavedReport
                      ? ' · this month is already on file — open your saved dashboard'
                      : uploadedCount < 3
                        ? ' · add all 3 sources for full reconciliation'
                        : hasStoredConflict && hasBoxWarnings
                          ? ' · fix highlighted boxes — this month is already on file'
                          : hasBoxWarnings
                            ? ' · fix the highlighted upload boxes'
                            : validationReady
                              ? ' · ready to analyze'
                              : ' · waiting for upload checks'}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
