import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Logo from '../components/common/Logo';
import UserAccountMenu from '../components/layout/UserAccountMenu';
import FileDropZone from '../components/upload/FileDropZone';
import AnalyzeProgressOverlay from '../components/upload/AnalyzeProgressOverlay';
import UploadContinuityNudge from '../components/upload/UploadContinuityNudge';
import UploadMethodChooser, { type UploadMethod } from '../components/upload/UploadMethodChooser';
import PreviousReportsPanel from '../components/analysis/PreviousReportsPanel';
import { usePlaidLinkBank } from '../hooks/usePlaidLinkBank';
import { useAnalysis } from '../context/AnalysisContext';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import {
  duplicateInfoFromValidation,
  downloadMonthlyReportPdf,
  fetchReportHistory,
  fetchSavedReport,
  freeTierLimitNotice,
  freeTierNoticeFromUploadThisMonth,
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
import { businessIdFromUser, fetchLinkedBankAccounts } from '../lib/plaidClient';
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

function fileListFromFile(file: File): FileList {
  const transfer = new DataTransfer();
  transfer.items.add(file);
  return transfer.files;
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
  /** True when this slot's file was already included in the last successful validate. */
  slotAlreadyVerified: boolean = false,
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

  // Always show checking while in-flight — never fall through to green.
  if (checking) {
    return {
      uploaded: true,
      checking: true,
      status: 'checking',
      fileName: file.name,
      sizeLabel: size,
      periodLabel: filenamePeriod,
      statusLine: filenamePeriod
        ? `Checking ${filenamePeriod}…`
        : 'Checking statement month…',
      detail: filenamePeriod
        ? `${size} · ${filenamePeriod} · verifying…`
        : `${size} · verifying…`,
    };
  }

  if (validationFailed && !slotAlreadyVerified) {
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

  // New/changed slot waiting for debounce or in-flight batch validate.
  if (!slotAlreadyVerified) {
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

function slotKeyAlreadyVerified(
  slot: UploadSlot,
  fileKeyValue: string,
  lastValidatedKeys: string,
): boolean {
  if (!fileKeyValue || !lastValidatedKeys) return false;
  const [bank, pos, ecommerce] = lastValidatedKeys.split('|');
  if (slot === 'bank') return fileKeyValue === bank;
  if (slot === 'pos') return fileKeyValue === pos;
  return fileKeyValue === ecommerce;
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
    files: draftFiles,
    uploadValidation: draftValidation,
    uploadValidatedKeys: draftValidatedKeys,
    setUploadValidationDraft,
  } = useAnalysis();
  const { isAuth, ready: authReady, user } = useAuth();
  const { isPaid } = useSubscription();
  const draftHydratedRef = useRef(false);
  const skipEmptyFileSyncRef = useRef(false);
  const manualUploadRef = useRef<HTMLDivElement | null>(null);
  const [, setDataMethod] = useState<UploadMethod | null>(null);
  const [bankLinked, setBankLinked] = useState(false);

  const { linkBank, busy: linkingBank, linkingMode, status: bankLinkStatus, ready: canLinkBank } =
    usePlaidLinkBank(user?.userId, {
      onLinked: () => {
        setBankLinked(true);
      },
    });

  useEffect(() => {
    if (!user?.userId?.trim()) {
      setBankLinked(false);
      return;
    }
    const businessId = businessIdFromUser(user.userId);
    let cancelled = false;
    void fetchLinkedBankAccounts(businessId)
      .then((accounts) => {
        if (!cancelled && accounts.length > 0) setBankLinked(true);
      })
      .catch(() => {
        if (!cancelled) setBankLinked(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.userId]);

  useEffect(() => {
    // Clear leftover flag from older deploys that gated upload behind a sign-in modal.
    try {
      sessionStorage.removeItem('asktill_need_post_payment_signin');
    } catch {
      /* private mode */
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
  /** Free-tier early gate: uploaded_at timestamps from report history. */
  const [savedUploadedAts, setSavedUploadedAts] = useState<string[]>([]);
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
  const savedUploadedAtsRef = useRef(savedUploadedAts);
  const isPaidRef = useRef(isPaid);
  savedUploadedAtsRef.current = savedUploadedAts;
  isPaidRef.current = isPaid;

  const rejectFreeTierUpload = useCallback(
    (notice: FreeTierLimitNotice | null) => {
      if (isPaid) return;
      if (notice) setPersistentFreeTierNotice(notice);
      validationRequestRef.current += 1;
      setValidation(null);
      setPinnedSlotWarnings({});
      validatedFileKeysRef.current = '';
      setUploadValidationDraft(null, '');
      setSlotChecking({ bank: false, pos: false, ecommerce: false });
      resetForm({ bank: undefined, pos: undefined, ecommerce: undefined });
      setUploadFormKey((key) => key + 1);
    },
    [resetForm, isPaid, setUploadValidationDraft],
  );

  // Restore files + green status after Profile / dashboard nav unmounts this page.
  useEffect(() => {
    if (draftHydratedRef.current) return;
    draftHydratedRef.current = true;
    const hasDraft = Boolean(draftFiles.bank || draftFiles.pos || draftFiles.ecommerce);
    if (!hasDraft) return;
    // Prevent the empty first paint from wiping AnalysisContext.files.
    skipEmptyFileSyncRef.current = true;
    resetForm({
      bank: draftFiles.bank ? fileListFromFile(draftFiles.bank) : undefined,
      pos: draftFiles.pos ? fileListFromFile(draftFiles.pos) : undefined,
      ecommerce: draftFiles.ecommerce ? fileListFromFile(draftFiles.ecommerce) : undefined,
    });
    if (draftValidation) {
      setValidation(draftValidation);
      validatedFileKeysRef.current = draftValidatedKeys;
    }
    setUploadFormKey((key) => key + 1);
  }, [draftFiles, draftValidation, draftValidatedKeys, resetForm]);

  useEffect(() => {
    // Wake backend for upload validate, then keep it warm while this page is open
    // (Render free tier spins down after idle — that is what makes checks feel stuck).
    void ensureBackendServiceReady(45_000);
    const keepAlive = window.setInterval(() => {
      void ensureBackendServiceReady(8_000);
    }, 90_000);
    return () => window.clearInterval(keepAlive);
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
    setUploadValidationDraft(null, '');
    setFiles({});
  }, [resetForm, setUploadValidationDraft, setFiles]);

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
  // Skip until draft hydrate finishes — otherwise remount would wipe context files.
  useEffect(() => {
    if (!draftHydratedRef.current) return;
    const empty = !bankFile && !posFile && !ecommerceFile;
    if (empty && skipEmptyFileSyncRef.current) return;
    skipEmptyFileSyncRef.current = false;
    // Defer so month-check POST is not competing with a full context re-render.
    startTransition(() => {
      setFiles({
        bank: bankFile,
        pos: posFile,
        ecommerce: ecommerceFile,
      });
    });
  }, [bankKey, posKey, ecommerceKey, bankFile, posFile, ecommerceFile, setFiles]);

  // Persist green status for Profile round-trips — only after check settles.
  useEffect(() => {
    if (!draftHydratedRef.current) return;
    if (uploadedCount > 0 && validatedFileKeysRef.current !== currentFileKeys) return;
    startTransition(() => {
      setUploadValidationDraft(validation, validatedFileKeysRef.current);
    });
  }, [validation, currentFileKeys, uploadedCount, setUploadValidationDraft]);

  useEffect(() => {
    clearUploadMismatch();
    clearStatementDuplicate();
    if (uploadedCount > 0) setUploadPrompt(null);
    // Reset continuity tip only when the form is cleared — not when the 2nd/3rd
    // box gets a file (that re-opened the popup and blocked the next drop).
    if (uploadedCount === 0) {
      setContinuityDismissed(false);
      setPostAnalyzeContinuity(null);
    }
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
      setSavedUploadedAts([]);
      return undefined;
    }

    let cancelled = false;
    // Start immediately — fetchReportHistory dedupes + caches so opening
    // "Previous reports" reuses this result instead of a second cold wait.
    void fetchReportHistory()
      .then(({ data }) => {
        if (cancelled) return;
        const reports = data.reports ?? [];
        setSavedReportCount(reports.length);
        setSavedUploadedAts(
          reports
            .map((row) => row.uploaded_at)
            .filter((iso): iso is string => Boolean(iso?.trim())),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setSavedReportCount(null);
          setSavedUploadedAts([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [authReady, isAuth]);

  useEffect(() => {
    if (uploadedCount < 1) {
      // Hydrating a draft: first paint is empty before resetForm applies — don't wipe.
      if (skipEmptyFileSyncRef.current) return undefined;
      setValidation(null);
      setPinnedSlotWarnings({});
      setValidationError(null);
      validatedFileKeysRef.current = '';
      setSlotChecking({ bank: false, pos: false, ecommerce: false });
      return undefined;
    }

    // Restored draft / already-green for these exact files — don't re-check.
    if (validatedFileKeysRef.current === currentFileKeys) {
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

    // Free tier: one upload per calendar month — block ASAP from report history
    // so we don't leave the first box spinning while validate cold-starts.
    const earlyFreeTierNotice = (): FreeTierLimitNotice | null => {
      if (isPaidRef.current) return null;
      const files = uploadFilesRef.current;
      const hasFile = Boolean(files.bank || files.pos || files.ecommerce);
      if (!hasFile) return null;
      return freeTierNoticeFromUploadThisMonth(savedUploadedAtsRef.current);
    };

    // Short debounce — keep rules, start the API ASAP. Slightly longer when adding
    // to an already-checked set so bank+pos+ecom dropped quickly = one request.
    const debounceMs =
      validatedFileKeysRef.current && validatedFileKeysRef.current !== currentFileKeys
        ? 280
        : 120;
    const timer = window.setTimeout(() => {
      void (async () => {
        if (cancelled || validationRequestRef.current !== requestId) return;

        const freeNotice = earlyFreeTierNotice();
        if (freeNotice) {
          rejectFreeTierUpload(freeNotice);
          return;
        }

        // Do not await report history here — that blocked month-check for seconds.
        // Free-tier gate still runs on the backend; client uses cached periods when ready.

        // Only spin boxes that are new/changed — keep already-green slots green.
        const prevKeys = validatedFileKeysRef.current.split('|');
        const prevBank = prevKeys[0] ?? '';
        const prevPos = prevKeys[1] ?? '';
        const prevEcom = prevKeys[2] ?? '';
        setSlotChecking({
          bank: Boolean(bankKey) && bankKey !== prevBank,
          pos: Boolean(posKey) && posKey !== prevPos,
          ecommerce: Boolean(ecommerceKey) && ecommerceKey !== prevEcom,
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
    }, debounceMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
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
  const lastValidatedKeys = validatedFileKeysRef.current;
  const bankAlreadyVerified = slotKeyAlreadyVerified('bank', bankKey, lastValidatedKeys);
  const posAlreadyVerified = slotKeyAlreadyVerified('pos', posKey, lastValidatedKeys);
  const ecommerceAlreadyVerified = slotKeyAlreadyVerified(
    'ecommerce',
    ecommerceKey,
    lastValidatedKeys,
  );
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
        bankAlreadyVerified && !slotChecking.bank && !slotWarnings.bank,
      ),
    [
      bankFile,
      activeValidation,
      slotWarnings,
      slotChecking.bank,
      validationFailed,
      validationError,
      bankAlreadyVerified,
    ],
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
        posAlreadyVerified && !slotChecking.pos && !slotWarnings.pos,
      ),
    [
      posFile,
      activeValidation,
      slotWarnings,
      slotChecking.pos,
      validationFailed,
      validationError,
      posAlreadyVerified,
    ],
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
        ecommerceAlreadyVerified && !slotChecking.ecommerce && !slotWarnings.ecommerce,
      ),
    [
      ecommerceFile,
      activeValidation,
      slotWarnings,
      slotChecking.ecommerce,
      validationFailed,
      validationError,
      ecommerceAlreadyVerified,
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
      // Boxes are done — clear local form (context draft already cleared on success).
      resetForm({ bank: undefined, pos: undefined, ecommerce: undefined });
      setValidation(null);
      setPinnedSlotWarnings({});
      validatedFileKeysRef.current = '';
      setUploadFormKey((key) => key + 1);
      setContinuityDismissed(false);
      const continuity = getAnalyzeAnalysis(result)?.upload_continuity ?? null;
      if (shouldShowContinuityNudge(continuity)) {
        setPostAnalyzeContinuity(continuity);
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
        const { data } = await fetchReportHistory({ force: true });
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
      {analyzeProgress && <AnalyzeProgressOverlay progress={analyzeProgress} />}
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
              {embedded
                ? 'Link your bank for automatic sync (month to date), or upload Bank, POS, and Ecom files below.'
                : 'Link your bank via Plaid, or upload your Bank, POS, and Ecom statements. Same period gives best results.'}
            </p>
            {showValidationContinuityNudge && validationContinuity ? (
              <UploadContinuityNudge
                continuity={validationContinuity}
                onDismiss={dismissContinuityNudge}
                blocking={false}
              />
            ) : null}
            {freeTierNotice ? (
              <div className={styles.freeTierBanner} role="alert" aria-labelledby="free-tier-title">
                <div className={styles.freeTierHeader}>
                  <h2 id="free-tier-title" className={styles.freeTierTitle}>
                    Come back next month
                  </h2>
                </div>
                <p className={styles.freeTierMessage}>
                  {freeTierNotice.storedLabel
                    ? `You've used your free upload for ${freeTierNotice.storedLabel}. Upgrade anytime for unlimited uploads.`
                    : "You've used this month's free upload. Upgrade anytime for unlimited uploads."}
                </p>
                <div className={styles.freeTierActions}>
                  <button
                    type="button"
                    className={styles.freeTierUpgradeBtn}
                    onClick={goToPricing}
                  >
                    Upgrade to Paid
                  </button>
                </div>
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

          <div className={styles.plaidPullSection}>
            <UploadMethodChooser
              variant={embedded ? 'tiles' : 'bar'}
              compact={embedded}
              linking={linkingBank}
              linkingMode={linkingMode}
              linkStatus={bankLinkStatus}
              canLink={canLinkBank}
              bankLinked={bankLinked}
              onConnectRealtime={() => {
                setDataMethod('realtime');
                void linkBank('realtime');
              }}
              onConnectMonthly={() => {
                setDataMethod('monthly');
                void linkBank('monthly');
              }}
              onChooseManual={() => {
                setDataMethod('manual');
                manualUploadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            />
            {bankLinked ? (
              <p className={styles.plaidLinkedHint}>
                Bank connected — live transactions sync from the 1st through today. Use{' '}
                <strong>Pull monthly statements</strong> to fetch PDF statements too. Results appear on your{' '}
                <button
                  type="button"
                  className={styles.plaidLinkedLink}
                  onClick={() => navigate(DEFAULT_DASHBOARD_PATH)}
                >
                  dashboard
                </button>
                .{' '}
                <Link to="/dashboard/linked-accounts" className={styles.plaidLinkedLink}>
                  Manage linked banks
                </Link>
              </p>
            ) : null}
          </div>

          <div ref={manualUploadRef} className={styles.manualUploadSection}>
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
              onReject={(message) => {
                setValidationError(message);
                setUploadPrompt(message);
              }}
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
              onReject={(message) => {
                setValidationError(message);
                setUploadPrompt(message);
              }}
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
              onReject={(message) => {
                setValidationError(message);
                setUploadPrompt(message);
              }}
            />
          </div>
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
