import type { UseFormRegister } from 'react-hook-form';
import type { FileUploadState } from '../../types';
import styles from './FileDropZone.module.css';

interface FileDropZoneProps {
  name: string;
  label: string;
  subLabel?: string;
  uploadState: FileUploadState;
  icon: React.ReactNode;
  register: UseFormRegister<Record<string, FileList>>;
}

export default function FileDropZone({
  name,
  label,
  subLabel,
  uploadState,
  icon,
  register,
}: FileDropZoneProps) {
  const hasWarning = Boolean(uploadState.warning);
  const isChecking = Boolean(uploadState.checking);
  const cardClass = hasWarning
    ? styles.warn
    : isChecking
      ? styles.checking
      : uploadState.uploaded
        ? styles.done
        : '';

  return (
    <div className={`${styles.uploadCard} ${cardClass}`}>
      <div className={styles.uploadIcon}>{icon}</div>
      <h3>{label}</h3>
      {subLabel ? <p className={styles.sub}>{subLabel}</p> : null}
      <label className={styles.dropZone}>
        <input
          type="file"
          accept=".pdf,.csv,.xlsx"
          style={{ display: 'none' }}
          {...register(name as keyof Record<string, FileList>)}
        />
        {uploadState.uploaded ? (
          <>
            <div className={hasWarning ? styles.dropTextWarn : styles.dropText}>
              {hasWarning ? 'Wrong file' : isChecking ? 'Checking file type and month…' : '✓ Uploaded'}
            </div>
            {!hasWarning && uploadState.fileName && (
              <div className={styles.fileName}>{uploadState.fileName}</div>
            )}
            {uploadState.detail && !hasWarning && (
              <div className={styles.dropMeta} style={{ marginTop: 6 }}>
                {uploadState.detail}
              </div>
            )}
            {hasWarning && uploadState.warning && (
              <div className={styles.warning}>{uploadState.warning}</div>
            )}
          </>
        ) : (
          <>
            <div className={styles.dropText}>Drop file here, or click to browse</div>
            <div className={styles.dropMeta}>CSV or XLSX · 10 MB max</div>
          </>
        )}
      </label>
    </div>
  );
}
