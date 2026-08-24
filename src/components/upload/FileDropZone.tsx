import type { UseFormRegister } from 'react-hook-form';
import type { FileUploadState } from '../../types';
import { validateUploadFile } from '../../lib/uploadFileValidation';
import styles from './FileDropZone.module.css';

interface FileDropZoneProps {
  name: string;
  label: string;
  subLabel?: string;
  uploadState: FileUploadState;
  icon: React.ReactNode;
  register: UseFormRegister<Record<string, FileList>>;
  /** Called when the user picks a file that fails client-side size/type checks. */
  onReject?: (message: string) => void;
}

function cardClassForState(uploadState: FileUploadState): string {
  const status = uploadState.status
    ?? (uploadState.warning
      ? 'warning'
      : uploadState.checking
        ? 'checking'
        : uploadState.uploaded
          ? 'verified'
          : undefined);
  switch (status) {
    case 'warning':
      return styles.warn;
    case 'verify-error':
      return styles.verifyError;
    case 'checking':
      return styles.checking;
    case 'verified':
      return styles.verified;
    default:
      return '';
  }
}

function badgeClassForState(uploadState: FileUploadState): string {
  const status = uploadState.status
    ?? (uploadState.warning ? 'warning' : uploadState.checking ? 'checking' : 'verified');
  switch (status) {
    case 'warning':
      return styles.badgeWarn;
    case 'verify-error':
      return styles.badgeVerify;
    case 'checking':
      return styles.badgeChecking;
    default:
      return styles.badgeVerified;
  }
}

export default function FileDropZone({
  name,
  label,
  subLabel,
  uploadState,
  icon,
  register,
  onReject,
}: FileDropZoneProps) {
  const status = uploadState.status
    ?? (uploadState.warning
      ? 'warning'
      : uploadState.checking
        ? 'checking'
        : uploadState.uploaded
          ? 'verified'
          : undefined);
  const cardClass = cardClassForState(uploadState);
  const isChecking = status === 'checking';
  const field = register(name as keyof Record<string, FileList>);

  return (
    <div className={`${styles.uploadCard} ${cardClass}`}>
      <div className={styles.uploadIcon}>{icon}</div>
      <h3>{label}</h3>
      {subLabel ? <p className={styles.sub}>{subLabel}</p> : null}
      <label className={styles.dropZone}>
        <input
          type="file"
          accept=".pdf,.csv,.xlsx,.xls,.tsv,application/pdf,text/csv,text/tab-separated-values,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          style={{ display: 'none' }}
          name={field.name}
          ref={field.ref}
          onBlur={field.onBlur}
          onChange={async (event) => {
            const input = event.currentTarget;
            const file = input.files?.[0];
            if (file) {
              const error = await validateUploadFile(file);
              if (error) {
                input.value = '';
                onReject?.(error);
                return;
              }
            }
            await field.onChange(event);
          }}
        />
        {uploadState.uploaded ? (
          <div className={styles.uploadBody}>
            {uploadState.statusLine ? (
              <span className={`${styles.statusBadge} ${badgeClassForState(uploadState)}`}>
                {isChecking ? (
                  <span className={styles.badgeSpinner} aria-hidden />
                ) : null}
                {uploadState.statusLine}
              </span>
            ) : null}
            {uploadState.fileName ? (
              <div className={styles.fileName}>{uploadState.fileName}</div>
            ) : null}
            <div className={styles.metaRow}>
              {uploadState.sizeLabel ? (
                <span className={styles.metaChip}>{uploadState.sizeLabel}</span>
              ) : null}
              {uploadState.periodLabel && status !== 'checking' ? (
                <span className={styles.metaChipPeriod}>{uploadState.periodLabel}</span>
              ) : null}
              {uploadState.periodLabel && isChecking ? (
                <span className={styles.metaChipPending}>{uploadState.periodLabel}?</span>
              ) : null}
            </div>
            {isChecking ? (
              <p className={styles.checkingHint}>
                {uploadState.statusLine?.includes('waiting') || uploadState.statusLine?.includes('Queued')
                  ? 'Queued — checking file type and statement month next…'
                  : 'Verifying file type and statement month on the server…'}
              </p>
            ) : null}
            {uploadState.warning ? (
              <div className={styles.warning}>{uploadState.warning}</div>
            ) : null}
          </div>
        ) : (
          <>
            <div className={styles.dropText}>Drop file here, or click to browse</div>
            <div className={styles.dropMeta}>PDF, CSV, or XLSX · 10 MB max</div>
          </>
        )}
      </label>
    </div>
  );
}
