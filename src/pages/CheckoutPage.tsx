import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';

import Logo from '../components/common/Logo';
import UserAccountMenu from '../components/layout/UserAccountMenu';
import { useAuth } from '../context/AuthContext';
import { createCheckoutSession, getApiError, primeBackendBeforeCheckout, warmupBackend } from '../lib/api';
import { getPlanById } from '../lib/plans';
import { assignStripeRedirect } from '../lib/safeRedirect';
import { isPaidTier } from '../lib/subscription';
import styles from './CheckoutPage.module.css';

function resolveReturnPath(raw: string | null): string {
  if (!raw?.trim()) return '/dashboard/sources';
  const path = raw.trim();
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('://')) {
    return '/dashboard/sources';
  }
  return path;
}

export default function CheckoutPage() {
  const { user, isAuth } = useAuth();
  const [params] = useSearchParams();
  const plan = useMemo(() => getPlanById(params.get('plan')), [params]);
  const returnTo = resolveReturnPath(params.get('from'));
  const pricingHref = `/pricing?from=${encodeURIComponent(returnTo)}`;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wake backend + parsers while user is on checkout (before Stripe redirect).
  useEffect(() => {
    void primeBackendBeforeCheckout();
  }, []);

  if (!plan) {
    return <Navigate to={pricingHref} replace />;
  }

  if (isPaidTier(user?.tier)) {
    return <Navigate to={returnTo} replace />;
  }

  const onPayWithStripe = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      // Finish parser warm before leaving — keeps Render instance busy through Stripe.
      void primeBackendBeforeCheckout();
      warmupBackend();
      const checkoutUrl = await createCheckoutSession(plan.id, returnTo);
      assignStripeRedirect(checkoutUrl);
    } catch (err) {
      setError(getApiError(err, 'Could not start checkout. Try again in a moment.'));
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={`wrap ${styles.headerInner}`}>
          <Logo to={isAuth ? '/dashboard/at-letter' : '/'} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Link to={pricingHref} className={styles.backLink}>
              ← Change plan
            </Link>
            {isAuth ? <UserAccountMenu /> : null}
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={`wrap ${styles.mainInner}`}>
          <h1 className={styles.title}>Complete your subscription</h1>
          <p className={styles.subtitle}>
            You&apos;ll pay on Stripe, then return here with Paid access unlocked.
          </p>

          <div className={styles.stepper} aria-label="Checkout progress">
            <div className={`${styles.step} ${styles.stepDone}`}>
              <span className={styles.stepNum}>✓</span>
              <span className={styles.stepLabel}>Choose plan</span>
            </div>
            <div className={styles.stepDivider} />
            <div className={`${styles.step} ${styles.stepActive}`}>
              <span className={styles.stepNum}>2</span>
              <span className={styles.stepLabel}>Pay securely</span>
            </div>
            <div className={styles.stepDivider} />
            <div className={styles.step}>
              <span className={styles.stepNum}>3</span>
              <span className={styles.stepLabel}>Start uploading</span>
            </div>
          </div>

          <div className={styles.layout}>
            <section className={styles.summaryCard} aria-label="Plan summary">
              <p className={styles.summaryLabel}>Your plan</p>
              <h2 className={styles.planName}>{plan.name}</h2>
              <p className={styles.planPrice}>
                {plan.price} <span>{plan.period}</span>
              </p>
              <ul className={styles.featureList}>
                {plan.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className={styles.flowCard} aria-label="Checkout steps">
              <h2 className={styles.flowTitle}>What happens next</h2>
              <div className={styles.flowSteps}>
                <div className={`${styles.flowStep} ${styles.flowStepDone}`}>
                  <span className={styles.flowStepNum}>✓</span>
                  <div className={styles.flowStepBody}>
                    <h3>Plan selected</h3>
                    <p>You chose {plan.name} ({plan.price} {plan.period}).</p>
                  </div>
                </div>

                <div className={`${styles.flowStep} ${styles.flowStepCurrent}`}>
                  <span className={styles.flowStepNum}>2</span>
                  <div className={styles.flowStepBody}>
                    <h3>Secure payment on Stripe</h3>
                    <p>
                      Stripe opens in a new page for card entry. Asktill never stores your card —
                      billing is handled by Stripe.
                    </p>
                    <p>Use test card <strong>4242 4242 4242 4242</strong> in test mode.</p>
                  </div>
                </div>

                <div className={styles.flowStep}>
                  <span className={styles.flowStepNum}>3</span>
                  <div className={styles.flowStepBody}>
                    <h3>Account upgrades automatically</h3>
                    <p>
                      After payment, you&apos;ll see a short activation screen, then land on upload
                      with multi-month access unlocked.
                    </p>
                  </div>
                </div>
              </div>

              {error ? (
                <div className={styles.notice} role="alert">
                  {error}
                </div>
              ) : null}

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() => void onPayWithStripe()}
                  disabled={loading}
                >
                  {loading ? 'Opening Stripe…' : `Pay with Stripe — ${plan.price}/${plan.period.replace('per ', '')}`}
                </button>
                <Link to={pricingHref} className={styles.btnSecondary}>
                  Change plan
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
