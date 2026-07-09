import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import Logo from '../components/common/Logo';
import UserAccountMenu from '../components/layout/UserAccountMenu';
import { useAuth } from '../context/AuthContext';
import { getPlanById } from '../lib/plans';
import { isPaidTier } from '../lib/subscription';
import styles from './CheckoutPage.module.css';

type CheckoutPhase = 'review' | 'payment' | 'complete';

function resolveReturnPath(raw: string | null): string {
  if (!raw?.trim()) return '/dashboard/sources';
  const path = raw.trim();
  if (!path.startsWith('/') || path.startsWith('//')) return '/dashboard/sources';
  return path;
}

function phaseToStep(phase: CheckoutPhase): number {
  if (phase === 'review') return 2;
  if (phase === 'payment') return 2;
  return 3;
}

export default function CheckoutPage() {
  const { user, isAuth } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const plan = useMemo(() => getPlanById(params.get('plan')), [params]);
  const returnTo = resolveReturnPath(params.get('from'));
  const pricingHref = `/pricing?from=${encodeURIComponent(returnTo)}`;
  const [phase, setPhase] = useState<CheckoutPhase>('review');
  const activeStep = phaseToStep(phase);

  if (!plan) {
    return <Navigate to={pricingHref} replace />;
  }

  if (isPaidTier(user?.tier)) {
    return <Navigate to={returnTo} replace />;
  }

  const onContinue = () => {
    if (phase === 'review') {
      setPhase('payment');
      return;
    }
    if (phase === 'payment') {
      setPhase('complete');
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
            Here&apos;s exactly what happens after you subscribe to {plan.name}.
          </p>

          <div className={styles.stepper} aria-label="Checkout progress">
            <div className={`${styles.step} ${styles.stepDone}`}>
              <span className={styles.stepNum}>✓</span>
              <span className={styles.stepLabel}>Choose plan</span>
            </div>
            <div className={styles.stepDivider} />
            <div className={`${styles.step} ${activeStep === 2 ? styles.stepActive : ''} ${activeStep > 2 ? styles.stepDone : ''}`}>
              <span className={styles.stepNum}>{activeStep > 2 ? '✓' : '2'}</span>
              <span className={styles.stepLabel}>Pay securely</span>
            </div>
            <div className={styles.stepDivider} />
            <div className={`${styles.step} ${activeStep === 3 ? styles.stepActive : ''}`}>
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

                <div
                  className={`${styles.flowStep} ${
                    phase === 'payment' ? styles.flowStepCurrent : phase === 'complete' ? styles.flowStepDone : ''
                  }`}
                >
                  <span className={styles.flowStepNum}>{phase === 'complete' ? '✓' : '2'}</span>
                  <div className={styles.flowStepBody}>
                    <h3>Secure payment on Stripe</h3>
                    <p>
                      You&apos;ll be redirected to Stripe to enter card details. Asktill never stores
                      your card — billing is handled by Stripe.
                    </p>
                    {phase === 'payment' ? (
                      <div className={styles.paymentPanel}>
                        <p className={styles.paymentPanelTitle}>Payment step (connecting next)</p>
                        <p>
                          Stripe Checkout will open here for {plan.price}/{plan.period.replace('per ', '')}.
                          After successful payment, Stripe notifies Asktill automatically.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div
                  className={`${styles.flowStep} ${phase === 'complete' ? styles.flowStepCurrent : ''}`}
                >
                  <span className={styles.flowStepNum}>3</span>
                  <div className={styles.flowStepBody}>
                    <h3>Account upgrades instantly</h3>
                    <p>
                      Your tier switches to Paid. You can upload multiple statement months right away
                      and return to upload with no free-plan block.
                    </p>
                  </div>
                </div>
              </div>

              {phase === 'complete' ? (
                <div className={styles.notice}>
                  Payment is not connected yet. When Stripe goes live, this page will redirect to
                  checkout and step 3 will happen automatically after you pay.
                </div>
              ) : null}

              <div className={styles.actions}>
                {phase === 'complete' ? (
                  <>
                    <button
                      type="button"
                      className={styles.btnPrimary}
                      onClick={() => navigate(returnTo)}
                    >
                      Back to upload
                    </button>
                    <Link to={pricingHref} className={styles.btnSecondary}>
                      View all plans
                    </Link>
                  </>
                ) : (
                  <>
                    <button type="button" className={styles.btnPrimary} onClick={onContinue}>
                      {phase === 'review' ? 'Continue to payment' : 'Simulate successful payment'}
                    </button>
                    <Link to={pricingHref} className={styles.btnSecondary}>
                      Change plan
                    </Link>
                  </>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
