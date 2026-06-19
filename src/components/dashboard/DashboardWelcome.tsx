import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { firstNameFromUser } from '../../lib/atLetterPreview';
import styles from './DashboardWelcome.module.css';

export function dashboardWelcomeHeader(firstName: string): {
  periodMeta: string;
  title: ReactNode;
} {
  const hey = firstName === 'there' ? 'Hey there' : `Hey ${firstName}`;
  return {
    periodMeta: 'WELCOME',
    title: (
      <>
        {hey}, <em>welcome.</em>
      </>
    ),
  };
}

export default function DashboardWelcome() {
  const { user } = useAuth();
  const firstName = firstNameFromUser(user);
  const hey = firstName === 'there' ? 'Hey there' : `Hey ${firstName}`;

  return (
    <section className={styles.card}>
      <p className={styles.lead}>
        {hey} — upload your statements to get your <strong>AT Letter</strong> and unlock your
        dashboard.
      </p>
      <p className={styles.detail}>
        Add your bank statement plus POS or ecommerce reports for one month, run analyze, and we&apos;ll
        fill in overview, cash flow, and reconciliation with your real numbers.
      </p>
      <Link to="/onboarding" className={styles.cta}>
        Upload statements →
      </Link>
    </section>
  );
}
