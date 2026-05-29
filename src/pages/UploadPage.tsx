import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/common/Logo';
import UserAccountMenu from '../components/layout/UserAccountMenu';
import FileDropZone from '../components/upload/FileDropZone';
import AnalyzeProgressOverlay from '../components/upload/AnalyzeProgressOverlay';
import { useAnalysis } from '../context/AnalysisContext';
import {
  duplicateInfoFromValidation,
  isAlreadyStoredMessage,
  hasStoredPeriodConflict,
  uploadHeaderAlerts,
  USER_STATE_RESET_EVENT,
  validateUploads,
  warmupBackend,
  warningsBySlot,
  type UploadValidationResult,
} from '../lib/api';
import type { FileUploadState } from '../types';
import styles from './UploadPage.module.css';

type FormData = Record<string, FileList>;
type UploadSlot = 'bank' | 'pos' | 'ecommerce';

const steps = [
  { label: 'Account', status: 'done' },
  { label: 'Upload data', status: 'active' },
  { label: 'Confirm sources', status: '' },
  { label: 'First insight', status: '' },
];

function fileFromList(list: FileList | undefined): File | undefined {
  return list?.[0];
}

function uploadStateFromFile(
  file: File | undefined,
  slot: UploadSlot,
  validation: UploadValidationResult | null,
  slotWarnings: ReturnType<typeof warningsBySlot>,
  checking: boolean,
  validationFailed: boolean,
): FileUploadState {
  if (!file) return { uploaded: false };
  const period = validation?.detected_periods?.[slot];
  const size = `${Math.round(file.size / 1024)} KB`;
  const slotWarning = slotWarnings[slot]?.trim() || undefined;
  return {
    uploaded: true,
    checking,
    fileName: file.name,
    detail: !checking && !slotWarning && period ? `${size} · ${period}` : checking ? undefined : size,
    warning:
      !checking && validationFailed && !slotWarning
        ? 'Could not verify this file.'
        : !checking
          ? slotWarning
          : undefined,
  };
}

function mergeValidation(
  live: UploadValidationResult | null,
  fromAnalyze: UploadValidationResult | null,
): UploadValidationResult | null {
  if (!live && !fromAnalyze) return null;
  if (!live) return fromAnalyze;
  if (!fromAnalyze) return live;
  return {
    ok: live.ok && fromAnalyze.ok,
    slot_mismatches: [...live.slot_mismatches, ...fromAnalyze.slot_mismatches],
    period_mismatches: [...live.period_mismatches, ...fromAnalyze.period_mismatches],
    missing_period_warnings: [
      ...(live.missing_period_warnings ?? []),
      ...(fromAnalyze.missing_period_warnings ?? []),
    ],
    stored_period_warnings: (live.stored_period_warnings?.length ?? 0) > 0
      ? live.stored_period_warnings
      : (fromAnalyze.stored_period_warnings ?? []),
    detected_periods: { ...fromAnalyze.detected_periods, ...live.detected_periods },
  };
}

function fileKey(file: File | undefined): string {
  return file ? `${file.name}:${file.size}:${file.lastModified}` : '';
}

export default function UploadPage() {
  const { register, watch, reset: resetForm } = useForm<FormData>();
  const navigate = useNavigate();
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
  } = useAnalysis();
  const [validation, setValidation] = useState<UploadValidationResult | null>(null);
  const [slotChecking, setSlotChecking] = useState<Record<UploadSlot, boolean>>({
    bank: false,
    pos: false,
    ecommerce: false,
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadPrompt, setUploadPrompt] = useState<string | null>(null);
  const validatedFileKeysRef = useRef('');
  const validationRequestRef = useRef(0);

  const resetUploadPage = useCallback(() => {
    resetForm({ bank: undefined, pos: undefined, ecommerce: undefined });
    setValidation(null);
    setSlotChecking({ bank: false, pos: false, ecommerce: false });
    setValidationError(null);
    setUploadPrompt(null);
    validatedFileKeysRef.current = '';
    validationRequestRef.current += 1;
  }, [resetForm]);

  useEffect(() => {
    warmupBackend();
  }, []);

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
  const uploadedCount = [bankFile, posFile, ecommerceFile].filter(Boolean).length;
  const currentFileKeys = `${bankKey}|${posKey}|${ecommerceKey}`;

  useEffect(() => {
    clearUploadMismatch();
    clearStatementDuplicate();
    if (uploadedCount > 0) setUploadPrompt(null);
  }, [bankKey, posKey, ecommerceKey, uploadedCount, clearUploadMismatch, clearStatementDuplicate]);

  const anySlotChecking = slotChecking.bank || slotChecking.pos || slotChecking.ecommerce;

  useEffect(() => {
    if (uploadedCount < 1) {
      setValidation(null);
      setValidationError(null);
      validatedFileKeysRef.current = '';
      setSlotChecking({ bank: false, pos: false, ecommerce: false });
      return undefined;
    }

    const fileKeysAtStart = currentFileKeys;
    let cancelled = false;
    const requestId = ++validationRequestRef.current;

    setSlotChecking({
      bank: Boolean(bankKey),
      pos: Boolean(posKey),
      ecommerce: Boolean(ecommerceKey),
    });
    setValidationError(null);

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const { data } = await validateUploads({
            bank: bankFile,
            pos: posFile,
            ecommerce: ecommerceFile,
          });
          if (cancelled || validationRequestRef.current !== requestId) return;
          if (fileKeysAtStart !== `${bankKey}|${posKey}|${ecommerceKey}`) return;

          setValidation(data);
          validatedFileKeysRef.current = fileKeysAtStart;
          if (hasStoredPeriodConflict(data)) {
            const dup = duplicateInfoFromValidation(data);
            if (dup) applyStatementDuplicate(dup);
          } else {
            clearStatementDuplicate();
          }
        } catch {
          if (cancelled || validationRequestRef.current !== requestId) return;
          if (fileKeysAtStart !== `${bankKey}|${posKey}|${ecommerceKey}`) return;
          setValidation(null);
          validatedFileKeysRef.current = '';
          setValidationError('Could not verify uploads. Check your connection and try again.');
        } finally {
          if (!cancelled && validationRequestRef.current === requestId) {
            setSlotChecking({ bank: false, pos: false, ecommerce: false });
          }
        }
      })();
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    bankFile,
    posFile,
    ecommerceFile,
    bankKey,
    posKey,
    ecommerceKey,
    uploadedCount,
    currentFileKeys,
    applyStatementDuplicate,
    clearStatementDuplicate,
  ]);

  const validationMatchesFiles = validatedFileKeysRef.current === currentFileKeys;
  const mergedValidation = useMemo(
    () => mergeValidation(validation, uploadMismatch),
    [validation, uploadMismatch],
  );
  const activeValidation = mergedValidation;
  const slotWarnings = useMemo(() => warningsBySlot(activeValidation), [activeValidation]);
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
      ),
    [bankFile, activeValidation, slotWarnings, slotChecking.bank, validationFailed],
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
      ),
    [posFile, activeValidation, slotWarnings, slotChecking.pos, validationFailed],
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
      ),
    [ecommerceFile, activeValidation, slotWarnings, slotChecking.ecommerce, validationFailed],
  );

  const headerAlerts = useMemo(() => {
    if (!validationMatchesFiles || anySlotChecking) {
      return { storedMessage: null, placementMessages: [] as string[] };
    }
    const alerts = uploadHeaderAlerts(mergedValidation, statementDuplicate);
    if (!alerts.storedMessage && error && isAlreadyStoredMessage(error)) {
      return { ...alerts, storedMessage: error };
    }
    return alerts;
  }, [statementDuplicate, mergedValidation, error, validationMatchesFiles, anySlotChecking]);

  const hasStoredConflict =
    validationMatchesFiles &&
    !anySlotChecking &&
    (Boolean(statementDuplicate) || hasStoredPeriodConflict(mergedValidation));
  const validationReady =
    validation != null &&
    validation.ok &&
    !validationError &&
    validatedFileKeysRef.current === currentFileKeys;
  const canSubmitAnalyze =
    uploadedCount >= 1 &&
    !loading &&
    !anySlotChecking &&
    !validationError &&
    !hasStoredConflict &&
    !hasBoxWarnings &&
    validationReady;

  useEffect(() => {
    if (headerAlerts.storedMessage && error && isAlreadyStoredMessage(error)) {
      clearError();
    }
  }, [headerAlerts.storedMessage, error, clearError]);

  const onContinue = async () => {
    if (loading || anySlotChecking || hasStoredConflict || uploadedCount < 1 || !validationReady) {
      if (!validationReady && !anySlotChecking && uploadedCount >= 1 && hasBoxWarnings) {
        setUploadPrompt(
          'Fix the highlighted upload issues (wrong file type, month mismatch, or duplicate month) before continuing.',
        );
      }
      return;
    }

    clearError();
    clearUploadMismatch();
    setUploadPrompt(null);

    const result = await runAnalyze({
      bank: bankFile,
      pos: posFile,
      ecommerce: ecommerceFile,
    });
    if (result) {
      navigate('/dashboard/overview');
      return;
    }
    if (uploadMismatch) {
      setUploadPrompt(
        'Fix the highlighted upload issues (wrong file type, month mismatch, or duplicate month) before continuing.',
      );
    }
  };

  return (
    <div className={styles.pageBg}>
      {analyzeProgress && <AnalyzeProgressOverlay progress={analyzeProgress} />}
      <nav className={styles.nav}>
        <div className="wrap">
          <div className={styles.navInner}>
            <Logo />
            <UserAccountMenu showName showProfile={false} />
          </div>
        </div>
      </nav>

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
        <div className={`wrap ${styles.pageInner}`}>
          <div className={styles.pageHeader}>
            <span className={styles.pageEyebrow}>Step 2 of 4</span>
            <h1>All your statements in <em>1 page</em></h1>
            <p className={styles.pageSub}>
              Upload your Bank, Pos, and Ecom statements. Same period will give best results
            </p>
            {headerAlerts.storedMessage ? (
              <div className={styles.duplicateBanner} role="alert">
                <p className={styles.duplicateMessage}>{headerAlerts.storedMessage}</p>
              </div>
            ) : null}
            {headerAlerts.placementMessages.length > 0 ? (
              <div className={styles.uploadIssuesBanner} role="alert">
                <p className={styles.uploadIssuesTitle}>Wrong file or month</p>
                <ul className={styles.uploadIssuesList}>
                  {headerAlerts.placementMessages.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className={styles.uploadGrid}>
            <FileDropZone
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
              {validationError}
            </div>
          )}

          {uploadPrompt && (
            <div className={styles.uploadPrompt} role="alert">
              <strong>Upload required</strong>
              {uploadPrompt}
            </div>
          )}

          {error &&
            !headerAlerts.storedMessage &&
            headerAlerts.placementMessages.length === 0 &&
            !hasBoxWarnings &&
            !isAlreadyStoredMessage(error) && (
            <div className={styles.micro} style={{ color: 'var(--neg)', marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div className={styles.ctaWrap}>
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={!canSubmitAnalyze}
              onClick={() => void onContinue()}
            >
              {loading ? 'Analyzing…' : 'Continue to dashboard'}
              <span>→</span>
            </button>
            <div className={styles.micro}>
              {uploadedCount} of 3 sources uploaded
              {loading
                ? ' · analyzing your statements'
                : uploadedCount < 1
                  ? ' · add at least one file to continue'
                  : anySlotChecking
                    ? ' · checking uploads'
                    : uploadedCount < 3
                      ? ' · add all 3 sources for full reconciliation'
                      : hasStoredConflict && hasBoxWarnings
                        ? ' · wrong files uploaded and this month is already on file'
                        : hasStoredConflict
                          ? ' · this month is already on file'
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
