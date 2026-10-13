import { useState } from 'react';
import type { TaxAdvisor } from '@asktill/channel-partners';

import { formatMoney } from '../../lib/format';

import styles from './BookConsultationModal.module.css';

type Props = {
  advisor: TaxAdvisor | null;
  open: boolean;
  onClose: () => void;
};

/** Book CPA consultation at the listed fee. */
export default function BookConsultationModal({ advisor, open, onClose }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!open || !advisor) return null;

  const fee = advisor.consultationFeeUsd ?? 0;

  const confirm = () => {
    setSubmitting(true);
    setDone(true);
    setSubmitting(false);
  };

  return (
    <div className={styles.backdrop} onClick={submitting ? undefined : onClose} role="presentation">
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-consult-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="book-consult-title" className={styles.title}>
          {done ? 'Booked' : 'Book consultation'}
        </h2>

        <p className={styles.advisorLine}>
          {advisor.name}, {advisor.credential} · {advisor.firm}
        </p>
        <p className={styles.meta}>{advisor.availability}</p>

        {done ? (
          <>
            <div className={styles.breakdown} aria-label="Payment summary">
              <div className={`${styles.row} ${styles.rowTotal}`}>
                <span>Consultation fee</span>
                <span>{formatMoney(fee)}</span>
              </div>
            </div>
            <p className={styles.success}>
              You’re booked with {advisor.name}. We’ll confirm the session shortly.
            </p>
            <div className={styles.actions}>
              <button type="button" className={styles.confirmBtn} onClick={onClose}>
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.breakdown} aria-label="Amount due">
              <div className={`${styles.row} ${styles.rowTotal}`}>
                <span>Consultation fee</span>
                <span>{formatMoney(fee)}</span>
              </div>
            </div>

            <div className={styles.actions}>
              <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.confirmBtn}
                onClick={confirm}
                disabled={submitting || fee <= 0}
                title={fee <= 0 ? 'Consultation fee unavailable' : undefined}
              >
                {fee > 0 ? `Pay ${formatMoney(fee)} & book` : 'Pay now & book'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
