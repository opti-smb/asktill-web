import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import Logo from '../components/common/Logo';
import PlanGrid from '../components/pricing/PlanGrid';
import UserAccountMenu from '../components/layout/UserAccountMenu';
import { useAuth } from '../context/AuthContext';
import { tierDisplayLabel } from '../lib/subscription';
import type { PlanDefinition } from '../lib/plans';
import styles from './PricingPage.module.css';

function resolveReturnPath(raw: string | null): string {
  if (!raw?.trim()) return '/dashboard/sources';
  const path = raw.trim();
  if (!path.startsWith('/') || path.startsWith('//')) return '/dashboard/sources';
  return path;
}

export default function PricingPage() {
  const { user, isAuth } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = resolveReturnPath(params.get('from'));

  const onSubscribe = (plan: PlanDefinition) => {
    const from = encodeURIComponent(returnTo);
    navigate(`/pricing/checkout?plan=${plan.id}&from=${from}`);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={`wrap ${styles.headerInner}`}>
          <Logo to={isAuth ? '/dashboard/at-letter' : '/'} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Link to={returnTo} className={styles.backLink}>
              ← Back to upload
            </Link>
            {isAuth ? <UserAccountMenu /> : null}
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={`wrap ${styles.mainInner}`}>
          <div className={styles.intro}>
            <span className={styles.eyebrow}>Pricing</span>
            <h1 className={styles.title}>Choose your plan</h1>
            <p className={styles.subtitle}>
              {isAuth
                ? `You're on ${tierDisplayLabel(user?.tier)}. Upgrade for multi-month uploads.`
                : 'All plans include the AT Letter and AT Rewards on every analysis.'}
            </p>
          </div>

          <div className={styles.plansWrap}>
            <PlanGrid variant="upgrade" userTier={user?.tier} onSubscribe={onSubscribe} />
          </div>

          <p className={styles.checkoutNote}>
            Subscribe to review your plan, see payment steps, and what unlocks after checkout.
          </p>
        </div>
      </main>
    </div>
  );
}
