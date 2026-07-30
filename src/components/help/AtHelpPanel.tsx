import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

import styles from './AtHelpPanel.module.css';

const PROD_AGENTS = 'https://asktill-agents.onrender.com';
const READY_MSG = 'asktill-at-help-ready';

function isLocalDevHost(url: string): boolean {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:|\/|$)/i.test(url);
}

function agentsBaseUrl(): string {
  const raw = (import.meta.env.VITE_AGENTS_API_URL as string | undefined)?.trim();
  if (import.meta.env.DEV) {
    return (raw || 'http://127.0.0.1:8001').replace(/\/$/, '');
  }
  // Never let a local .env leak into the production iframe.
  if (!raw || isLocalDevHost(raw)) return PROD_AGENTS;
  return raw.replace(/\/$/, '');
}

interface Props {
  onClose?: () => void;
}

/** AT Help drawer — embeds Raise an Issue UI from Agents Service. */
export default function AtHelpPanel({ onClose }: Props) {
  const { user } = useAuth();
  const [frameState, setFrameState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reloadKey, setReloadKey] = useState(0);

  const src = useMemo(() => {
    const url = new URL(`${agentsBaseUrl()}/help/raise-issue`);
    const business = user?.businessName?.trim() || user?.name?.trim();
    const email = user?.email?.trim();
    if (business) url.searchParams.set('business', business);
    if (email) url.searchParams.set('email', email);
    return url.toString();
  }, [user?.businessName, user?.name, user?.email]);

  useEffect(() => {
    setFrameState('loading');
    const timer = window.setTimeout(() => {
      setFrameState((prev) => (prev === 'loading' ? 'error' : prev));
    }, 18000);
    return () => window.clearTimeout(timer);
  }, [src, reloadKey]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if ((data as { type?: string }).type !== READY_MSG) return;
      const origin = event.origin;
      if (
        origin === PROD_AGENTS ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.startsWith('http://localhost:')
      ) {
        setFrameState('ready');
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

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

      <div className={styles.frameWrap}>
        {frameState === 'loading' ? (
          <div className={styles.frameStatus} role="status" aria-live="polite">
            <span className={styles.spinner} aria-hidden />
            <p className={styles.statusTitle}>Loading AT Help</p>
            <p className={styles.statusDetail}>Connecting to AskTill support…</p>
          </div>
        ) : null}

        {frameState === 'error' ? (
          <div className={styles.offline} role="alert">
            <p className={styles.offlineTitle}>Couldn’t open AT Help</p>
            <p className={styles.offlineBody}>
              The support form didn’t load. Check your connection, then try again.
            </p>
            <button
              type="button"
              className={styles.retryBtn}
              onClick={() => {
                setReloadKey((k) => k + 1);
                setFrameState('loading');
              }}
            >
              Try again
            </button>
            <p className={styles.offlineHint}>
              Or open{' '}
              <a href={src} target="_blank" rel="noreferrer">
                raise an issue
              </a>{' '}
              in a new tab.
            </p>
          </div>
        ) : (
          <iframe key={reloadKey} className={styles.frame} title="Raise an Issue" src={src} />
        )}
      </div>
    </section>
  );
}
