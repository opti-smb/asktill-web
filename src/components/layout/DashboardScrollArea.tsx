import type { ReactNode } from 'react';

import styles from './DashboardScrollArea.module.css';

export default function DashboardScrollArea({ children }: { children: ReactNode }) {
  return (
    <div className={styles.main}>
      <div className={styles.scrollViewport}>{children}</div>
    </div>
  );
}
