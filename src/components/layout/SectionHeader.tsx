import type { ReactNode } from 'react';
import styles from './SectionHeader.module.css';

interface SectionHeaderProps {
  periodMeta?: string | null;
  title: ReactNode;
  actions?: ReactNode;
}

export default function SectionHeader({ periodMeta, title, actions }: SectionHeaderProps) {
  return (
    <div className={styles.headerStrip}>
      <div className="wrap">
        <div className={styles.headerRow}>
          <div>
            {periodMeta ? <div className={styles.periodMeta}>{periodMeta}</div> : null}
            <h1 className={styles.h1}>{title}</h1>
          </div>
          {actions ? <div className={styles.headerActions}>{actions}</div> : null}
        </div>
      </div>
    </div>
  );
}
