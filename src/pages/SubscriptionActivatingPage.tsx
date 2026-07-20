import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import Logo from '../components/common/Logo';
import UserAccountMenu from '../components/layout/UserAccountMenu';
import { useAuth } from '../context/AuthContext';
import { confirmCheckoutSession, warmupBackend } from '../lib/api';
import { TIER_PAID } from '../lib/subscription';
import styles from './SubscriptionActivatingPage.module.css';

const READY_MS = 80;
const NAVIGATE_MS = 180;

const confirmedSessions = new Set<string>();

function resolveReturnPath(raw: string | null): string {
  if (!raw?.trim()) return '/onboarding';
  const path = raw.trim();
  if (!path.startsWith('/') || path.startsWith('//')) return '/onboarding';
  return path;
}

export default function SubscriptionActivatingPage() {
  const { patchUserTier, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sessionId = params.get('session_id')?.trim() ?? '';
  const fromParam = params.get('from');
  const returnTo = useMemo(() => resolveReturnPath(fromParam), [fromParam]);
  const [ready, setReady] = useState(false);
  const navigatedRef = useRef(false);

  // Keep latest callbacks without re-arming timers on every AuthContext render.
  const patchUserTierRef = useRef(patchUserTier);
  const refreshUserRef = useRef(refreshUser);
  patchUserTierRef.current = patchUserTier;
  refreshUserRef.current = refreshUser;

  useEffect(() => {
    if (!sessionId || navigatedRef.current) return undefined;

    // Wake backend during activation so the next upload validate isn't cold.
    warmupBackend();

    patchUserTierRef.current(TIER_PAID);

    if (!confirmedSessions.has(sessionId)) {
      confirmedSessions.add(sessionId);
      void confirmCheckoutSession(sessionId)
        .catch(() => undefined)
        .finally(() => {
          void refreshUserRef.current();
        });
    }

    const readyTimer = window.setTimeout(() => setReady(true), READY_MS);
    const navTimer = window.setTimeout(() => {
      if (navigatedRef.current) return;
      navigatedRef.current = true;
      navigate(returnTo, { replace: true });
    }, NAVIGATE_MS);

    return () => {
      window.clearTimeout(readyTimer);
      window.clearTimeout(navTimer);
    };
  }, [sessionId, returnTo, navigate]);

  if (!sessionId) {
    return <Navigate to="/pricing" replace />;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={`wrap ${styles.headerInner}`}>
          <Logo to="/dashboard/at-letter" />
          <UserAccountMenu />
        </div>
      </header>

      <main className={styles.main}>
        <div className={`wrap ${styles.mainInner}`}>
          <span className={styles.eyebrow}>Subscription</span>
          <h1 className={styles.title}>Setting up your account</h1>
          <p className={styles.subtitle}>
            One last step — we&apos;re unlocking multi-month uploads on your account.
          </p>

          <div className={styles.stepper} aria-label="Checkout progress">
            <div className={`${styles.step} ${styles.stepDone}`}>
              <span className={styles.stepNum}>✓</span>
              <span>Choose plan</span>
            </div>
            <div className={styles.stepDivider} />
            <div className={`${styles.step} ${styles.stepDone}`}>
              <span className={styles.stepNum}>✓</span>
              <span>Pay securely</span>
            </div>
            <div className={styles.stepDivider} />
            <div className={`${styles.step} ${ready ? styles.stepDone : styles.stepActive}`}>
              <span className={styles.stepNum}>{ready ? '✓' : '3'}</span>
              <span>Activate</span>
            </div>
            <div className={styles.stepDivider} />
            <div className={`${styles.step} ${ready ? styles.stepActive : ''}`}>
              <span className={styles.stepNum}>4</span>
              <span>Upload</span>
            </div>
          </div>

          <section className={styles.card} aria-live="polite" aria-busy={!ready}>
            <div className={styles.iconWrap}>
              {ready ? (
                <span className={styles.checkIcon} aria-hidden>
                  ✓
                </span>
              ) : (
                <div className={styles.spinner} aria-hidden />
              )}
            </div>

            <h2 className={styles.cardTitle}>
              {ready ? 'Plan activated' : 'Payment successful'}
            </h2>
            <p className={styles.cardHint}>
              {ready ? 'Taking you to upload…' : 'Activating your Paid plan…'}
            </p>

            {!ready ? (
              <div className={styles.progressDots} aria-hidden>
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.dot} />
              </div>
            ) : null}

            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => {
                navigatedRef.current = true;
                navigate(returnTo, { replace: true });
              }}
            >
              Continue to upload
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}
