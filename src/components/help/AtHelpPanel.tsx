import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { RENDER_AGENTS_ORIGIN, resolvePublicUrl } from '../../lib/publicUrls';

import styles from './AtHelpPanel.module.css';

const READY_MSG = 'asktill-at-help-ready';

function agentsBaseUrl(): string {
  return resolvePublicUrl(
    import.meta.env.VITE_AGENTS_API_URL as string | undefined,
    'agents',
  );
}

/** Trust localhost, same-origin EC2 proxy (/svc/agents), and configured Agents origin. */
function isTrustedHelpOrigin(origin: string): boolean {
  try {
    const incoming = new URL(origin);
    if (incoming.hostname === 'localhost' || incoming.hostname === '127.0.0.1') {
      return true;
    }
    if (typeof window !== 'undefined' && incoming.origin === window.location.origin) {
      return true;
    }
    const agentsOrigin = new URL(agentsBaseUrl()).origin;
    if (incoming.origin === agentsOrigin) {
      return true;
    }
    // Allow the Vercel/Render Agents iframe origin if it ever posts here.
    return incoming.origin === new URL(RENDER_AGENTS_ORIGIN).origin;
  } catch {
    return false;
  }
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
    // Bust cached iframe HTML after EC2 /svc/agents path fixes.
    url.searchParams.set('v', '3');
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
      if (isTrustedHelpOrigin(event.origin)) {
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
