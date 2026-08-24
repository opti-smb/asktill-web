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
        Link a bank and we pull statements and transactions in the background — your dashboard
        fills automatically. Or upload bank + POS/ecommerce PDFs for one month and run analyze.
      </p>
      <div className={styles.ctaRow}>
        <Link to="/dashboard/linked-accounts" className={styles.ctaSecondary}>
          Link bank
        </Link>
        <Link to="/onboarding" className={styles.cta}>
          Upload statements →
        </Link>
      </div>
    </section>
  );
}
