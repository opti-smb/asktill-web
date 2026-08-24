import { Link, Navigate, useParams } from 'react-router-dom';

import Logo from '../components/common/Logo';
import { formatPolicyBody } from '../lib/formatPolicyBody';
import { POLICIES, getPolicy } from '../lib/policies';

import styles from './PolicyPage.module.css';

export default function PolicyPage() {
  const { slug } = useParams<{ slug: string }>();
  const policy = getPolicy(slug);

  if (!policy) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <Link to="/" aria-label="Asktill home">
            <Logo />
          </Link>
          <Link to="/" className={styles.back}>
            ← Back to home
          </Link>
        </div>
      </header>

      <main className={styles.shell}>
        <article className={styles.card}>{formatPolicyBody(policy.body, styles)}</article>

        <nav className={styles.policyNav} aria-label="Other policies">
          {POLICIES.filter((item) => item.slug !== policy.slug).map((item) => (
            <Link key={item.slug} to={`/policies/${item.slug}`}>
              {item.shortLabel}
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
}
