import { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';

import LandingSiteHeader from '../components/layout/LandingSiteHeader';
import { formatPolicyBody } from '../lib/formatPolicyBody';
import { POLICIES, getPolicy } from '../lib/policies';

import styles from './PolicyPage.module.css';

export default function PolicyPage() {
  const { slug } = useParams<{ slug: string }>();
  const policy = getPolicy(slug);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [slug]);

  if (!policy) {
    return <Navigate to="/" replace />;
  }

  const scrollToPolicyTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };

  return (
    <div className={styles.page}>
      <LandingSiteHeader />

      <main className={styles.shell}>
        <article className={styles.card} id="policy-top">
          {formatPolicyBody(policy.body, styles)}
        </article>

        <nav className={styles.policyNav} aria-label="Other policies">
          {POLICIES.filter((item) => item.slug !== policy.slug).map((item) => (
            <Link
              key={item.slug}
              to={`/policies/${item.slug}`}
              onClick={scrollToPolicyTop}
            >
              {item.shortLabel}
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
}
