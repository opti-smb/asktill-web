import { useEffect, useMemo, useRef, useState } from 'react';
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
  storedPeriodMessage,
  validateUploads,
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
): FileUploadState {
  if (!file) return { uploaded: false };
  const period = validation?.detected_periods?.[slot];
  const size = `${Math.round(file.size / 1024)} KB`;
  return {
    uploaded: true,
    fileName: file.name,
    detail: period ? `${size} · ${period}` : size,
    warning:
      slotWarnings[slot] && !isAlreadyStoredMessage(slotWarnings[slot])
        ? slotWarnings[slot]
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
  const { register, watch } = useForm<FormData>();
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
  const [validating, setValidating] = useState(false);
  const [validationFailed, setValidationFailed] = useState(false);
  const [uploadPrompt, setUploadPrompt] = useState<string | null>(null);
  const validatedFileKeysRef = useRef('');

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
    setValidation(null);
    validatedFileKeysRef.current = '';
    if (uploadedCount > 0) setUploadPrompt(null);
    if (uploadedCount === 0) setValidationFailed(false);
  }, [bankKey, posKey, ecommerceKey, uploadedCount, clearUploadMismatch, clearStatementDuplicate]);

  useEffect(() => {
    if (uploadedCount < 1) {
      setValidation(null);
      setValidationFailed(false);
      return undefined;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setValidating(true);
      setValidationFailed(false);
      try {
        const { data } = await validateUploads({
          bank: bankFile,
          pos: posFile,
          ecommerce: ecommerceFile,
        });
        if (!cancelled) {
          setValidation(data);
          setValidationFailed(false);
          validatedFileKeysRef.current = currentFileKeys;
        }
      } catch {
        if (!cancelled) {
          setValidation(null);
          setValidationFailed(true);
        }
      } finally {
        if (!cancelled) setValidating(false);
      }
    }, 900);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [bankFile, posFile, ecommerceFile, uploadedCount, currentFileKeys]);

  const validationMatchesFiles = validatedFileKeysRef.current === currentFileKeys;
  const mergedValidation = useMemo(
    () => mergeValidation(validation, uploadMismatch),
    [validation, uploadMismatch],
  );
  const activeValidation =
    validationMatchesFiles && !validating ? mergedValidation : validation;
  const slotWarnings = useMemo(() => warningsBySlot(activeValidation), [activeValidation]);
  const hasBoxWarnings = Boolean(slotWarnings.bank || slotWarnings.pos || slotWarnings.ecommerce);

  const bankState = useMemo(
    () => uploadStateFromFile(bankFile, 'bank', activeValidation, slotWarnings),
    [bankFile, activeValidation, slotWarnings],
  );
  const posState = useMemo(
    () => uploadStateFromFile(posFile, 'pos', activeValidation, slotWarnings),
    [posFile, activeValidation, slotWarnings],
  );
  const ecommerceState = useMemo(
    () => uploadStateFromFile(ecommerceFile, 'ecommerce', activeValidation, slotWarnings),
    [ecommerceFile, activeValidation, slotWarnings],
  );

  const headerNotice = useMemo(() => {
    if (!validationMatchesFiles || validating) return null;
    if (statementDuplicate?.message) {
      return statementDuplicate.message;
    }
    const fromValidation = storedPeriodMessage(mergedValidation);
    if (fromValidation) return fromValidation;
    if (error && isAlreadyStoredMessage(error)) return error;
    return null;
  }, [statementDuplicate, mergedValidation, error, validationMatchesFiles, validating]);

  useEffect(() => {
    if (validating || !validationMatchesFiles || !mergedValidation) return;
    if (hasStoredPeriodConflict(mergedValidation)) {
      const fromValidation = duplicateInfoFromValidation(mergedValidation);
      if (fromValidation) applyStatementDuplicate(fromValidation);
    } else {
      clearStatementDuplicate();
    }
  }, [
    mergedValidation,
    validating,
    validationMatchesFiles,
    applyStatementDuplicate,
    clearStatementDuplicate,
  ]);

  const hasStoredConflict =
    validationMatchesFiles &&
    !validating &&
    (Boolean(statementDuplicate) || hasStoredPeriodConflict(mergedValidation));
  const validationReady =
    validation != null &&
    validation.ok &&
    !validationFailed &&
    validatedFileKeysRef.current === currentFileKeys;
  const canSubmitAnalyze =
    uploadedCount >= 1 &&
    !loading &&
    !validating &&
    !hasStoredConflict &&
    !hasBoxWarnings &&
    (validationReady || validation === null || validationFailed);

  useEffect(() => {
    if (headerNotice && error && isAlreadyStoredMessage(error)) {
      clearError();
    }
  }, [headerNotice, error, clearError]);

  const onContinue = async () => {
    if (loading || validating || hasStoredConflict || uploadedCount < 1) return;

    clearError();
    clearUploadMismatch();
    setUploadPrompt(null);

    const useCachedValidation =
      validation?.ok &&
      !validationFailed &&
      validatedFileKeysRef.current === currentFileKeys &&
      !hasStoredPeriodConflict(validation);

    if (!useCachedValidation) {
      setValidating(true);
      try {
        const { data: freshValidation } = await validateUploads({
          bank: bankFile,
          pos: posFile,
          ecommerce: ecommerceFile,
        });
        setValidation(freshValidation);
        setValidationFailed(false);
        validatedFileKeysRef.current = currentFileKeys;
        if (hasStoredPeriodConflict(freshValidation)) {
          const dup = duplicateInfoFromValidation(freshValidation);
          if (dup) applyStatementDuplicate(dup);
          return;
        }
        if (!freshValidation.ok) {
          setUploadPrompt(
            'Fix the highlighted upload issues (wrong file type, month mismatch, or duplicate month) before continuing.',
          );
          return;
        }
      } catch {
        setValidationFailed(true);
        setUploadPrompt('Could not verify uploads. Check your connection and try again.');
        return;
      } finally {
        setValidating(false);
      }
    }

    const result = await runAnalyze({
      bank: bankFile,
      pos: posFile,
      ecommerce: ecommerceFile,
    });
    if (result) navigate('/dashboard/overview');
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
        <div className="wrap">
          <div className={styles.pageHeader}>
            <span className={styles.pageEyebrow}>Step 2 of 4</span>
            <h1>Connect <em>your three sources.</em></h1>
            <p className={styles.pageSub}>
              Drop in your bank statement, POS export, and ecommerce file. PDFs and CSVs both work. We'll do the rest.
            </p>
            {headerNotice ? (
              <div className={styles.duplicateBanner} role="alert">
                <p className={styles.duplicateMessage}>{headerNotice}</p>
              </div>
            ) : null}
          </div>

          <div className={styles.uploadGrid}>
            <FileDropZone
              name="bank"
              label="Bank statement"
              subLabel="Most major US banks supported"
              uploadState={bankState}
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              }
              register={register}
            />
            <FileDropZone
              name="pos"
              label="POS export"
              subLabel="Square, Toast, Clover, more"
              uploadState={posState}
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              }
              register={register}
            />
            <FileDropZone
              name="ecommerce"
              label="Ecommerce"
              subLabel="Shopify, Stripe, WooCommerce"
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
              <strong>Your data stays your data.</strong> Encrypted at rest and in transit. Personal details (account numbers, customer names) are tokenized before analysis — our team never sees them in the clear.
            </div>
          </div>

          {validating && !loading && uploadedCount >= 1 && (
            <div className={styles.micro} style={{ marginBottom: 12, color: 'var(--muted)' }}>
              Checking file type and month…
            </div>
          )}

          {uploadPrompt && (
            <div className={styles.uploadPrompt} role="alert">
              <strong>Upload required</strong>
              {uploadPrompt}
            </div>
          )}

          {error && !headerNotice && !hasBoxWarnings && !isAlreadyStoredMessage(error) && (
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
                  : validating
                    ? ' · checking uploads'
                    : uploadedCount < 3
                      ? ' · add all 3 sources for full reconciliation'
                      : hasStoredConflict
                        ? ' · this month is already on file'
                        : hasBoxWarnings
                          ? ' · fix the highlighted upload boxes'
                          : validationReady || validationFailed
                            ? ' · ready to analyze'
                            : ' · checking uploads'}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
