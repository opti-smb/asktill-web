import type { UseFormRegister } from 'react-hook-form';
import type { FileUploadState } from '../../types';
import styles from './FileDropZone.module.css';

interface FileDropZoneProps {
  name: string;
  label: string;
  subLabel: string;
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
  return (
    <div className={`${styles.uploadCard} ${uploadState.uploaded ? styles.done : ''}`}>
      <div className={styles.uploadIcon}>{icon}</div>
      <h3>{label}</h3>
      <div className={styles.sub}>{subLabel}</div>
      <label className={styles.dropZone}>
        <input
          type="file"
          accept=".pdf,.csv,.xlsx"
          style={{ display: 'none' }}
          {...register(name as keyof Record<string, FileList>)}
        />
        {uploadState.uploaded ? (
          <>
            <div className={styles.dropText}>✓ Uploaded</div>
            {uploadState.fileName && (
              <div className={styles.fileName}>{uploadState.fileName}</div>
            )}
            {uploadState.detail && (
              <div className={styles.dropMeta} style={{ marginTop: 6 }}>{uploadState.detail}</div>
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
