import { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';

import styles from './AtHelpPanel.module.css';

function agentsBaseUrl(): string {
  const raw = (import.meta.env.VITE_AGENTS_API_URL as string | undefined)?.trim();
  if (raw) return raw.replace(/\/$/, '');
  if (import.meta.env.DEV) return 'http://127.0.0.1:8001';
  return 'https://asktill-agents.onrender.com';
}

interface Props {
  onClose?: () => void;
}

/** AT Help drawer — embeds Raise an Issue UI from Agents Service. */
export default function AtHelpPanel({ onClose }: Props) {
  const { user } = useAuth();

  const src = useMemo(() => {
    const url = new URL(`${agentsBaseUrl()}/help/raise-issue`);
    const business = user?.businessName?.trim() || user?.name?.trim();
    const email = user?.email?.trim();
    if (business) url.searchParams.set('business', business);
    if (email) url.searchParams.set('email', email);
    return url.toString();
  }, [user?.businessName, user?.name, user?.email]);

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>AT Help</h2>
          <p className={styles.sub}>Raise an issue with AskTill support</p>
        </div>
        {onClose ? (
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        ) : null}
      </div>
      <iframe
        className={styles.frame}
        title="Raise an Issue"
        src={src}
        referrerPolicy="no-referrer"
      />
    </section>
  );
}
