import type { UploadContinuityView } from '../../lib/uploadContinuity';
import { missingMonthSummary } from '../../lib/uploadContinuity';
import styles from './UploadContinuityNudge.module.css';

type Props = {
  continuity: UploadContinuityView;
  onDismiss: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  /** false = tip banner (does not block other upload boxes). Default true = modal. */
  blocking?: boolean;
};

export default function UploadContinuityNudge({
  continuity,
  onDismiss,
  onContinue,
  continueLabel = 'Continue to dashboard',
  blocking = true,
}: Props) {
  const missing = missingMonthSummary(continuity);
  const title = continuity.nudge_title?.trim() || 'Upload months in order';
  const message =
    continuity.nudge_message?.trim()
    || (missing
      ? `Hey — you skipped ${missing}. Upload months in order for the best analysis.`
      : 'Hey — upload months in order for the best analysis.');

  const card = (
    <div className={blocking ? styles.card : styles.banner}>
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
  );

  if (!blocking) {
    return (
      <div className={styles.bannerWrap} role="status" aria-labelledby="upload-continuity-title">
        {card}
      </div>
    );
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="upload-continuity-title">
      {card}
    </div>
  );
}
