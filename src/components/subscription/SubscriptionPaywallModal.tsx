import styles from './SubscriptionPaywallModal.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  featureLabel?: string;
}

function paywallCopy(featureLabel?: string): { title: string; body: string } {
  const label = featureLabel?.trim() ?? '';
  if (/multi-month|statement upload/i.test(label)) {
    return {
      title: 'One month on Free plan',
      body: 'Free includes one statement month. Upgrade to Paid to upload more months.',
    };
  }
  if (label) {
    return {
      title: 'Paid plan required',
      body: `${label} is available on Paid.`,
    };
  }
  return {
    title: 'Paid plan required',
    body: 'Upgrade to Paid to unlock this feature.',
  };
}

export default function SubscriptionPaywallModal({ open, onClose, featureLabel }: Props) {
  if (!open) return null;

  const { title, body } = paywallCopy(featureLabel);

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-labelledby="paywall-title">
      <div className={styles.card}>
        <h2 id="paywall-title" className={styles.title}>
          {title}
        </h2>
        <p className={styles.body}>{body}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.primaryBtn} onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
