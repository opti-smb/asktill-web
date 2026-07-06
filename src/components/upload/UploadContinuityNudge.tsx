import type { UploadContinuityView } from '../../lib/uploadContinuity';
import { missingMonthSummary } from '../../lib/uploadContinuity';
import styles from './UploadContinuityNudge.module.css';

type Props = {
  continuity: UploadContinuityView;
  onDismiss: () => void;
  onContinue?: () => void;
  continueLabel?: string;
};

export default function UploadContinuityNudge({
  continuity,
  onDismiss,
  onContinue,
  continueLabel = 'Continue to dashboard',
}: Props) {
  const missing = missingMonthSummary(continuity);
  const title = continuity.nudge_title?.trim() || 'Upload months in order';
  const message =
    continuity.nudge_message?.trim()
    || (missing
      ? `Hey — you skipped ${missing}. Upload months in order for the best analysis.`
      : 'Hey — upload months in order for the best analysis.');

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="upload-continuity-title">
      <div className={styles.card}>
        <div className={styles.header}>
          <h2 id="upload-continuity-title" className={styles.title}>
            {title}
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            aria-label="Dismiss"
            onClick={onDismiss}
          >
            ×
          </button>
        </div>
        <p className={styles.message}>{message}</p>
        {onContinue ? (
          <div className={styles.actions}>
            <button type="button" className={styles.continueBtn} onClick={onContinue}>
              {continueLabel}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
