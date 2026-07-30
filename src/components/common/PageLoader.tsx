import type { ReactNode } from 'react';

import styles from './PageLoader.module.css';

type PageLoaderProps = {
  title?: string;
  detail?: string;
};

/** Full-viewport loading state — use instead of bare "Loading…" text. */
export default function PageLoader({
  title = 'Loading',
  detail,
}: PageLoaderProps): ReactNode {
  return (
    <div className={styles.shell} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.card}>
        <span className={styles.spinner} aria-hidden />
        <p className={styles.title}>{title}</p>
        {detail ? <p className={styles.detail}>{detail}</p> : null}
      </div>
    </div>
  );
}
