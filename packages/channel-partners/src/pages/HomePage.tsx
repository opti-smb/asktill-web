import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

import { PARTNER_CATEGORIES } from '../data/loans';
import styles from '../styles/channelPartners.module.css';

const ICON_PROPS = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** Same small-box pattern as AT Ledger Cash Flow cards. */
const CATEGORY_ICONS: Record<string, { icon: ReactNode; tone: 'blue' | 'green' }> = {
  loans: {
    tone: 'blue',
    icon: (
      <svg {...ICON_PROPS} aria-hidden>
        <line x1="3" y1="22" x2="21" y2="22" />
        <line x1="6" y1="18" x2="6" y2="11" />
        <line x1="10" y1="18" x2="10" y2="11" />
        <line x1="14" y1="18" x2="14" y2="11" />
        <line x1="18" y1="18" x2="18" y2="11" />
        <polygon points="12 2 22 7 2 7" />
      </svg>
    ),
  },
  advisors: {
    tone: 'green',
    icon: (
      <svg {...ICON_PROPS} aria-hidden>
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="8" y1="6" x2="16" y2="6" />
        <line x1="8" y1="10" x2="10" y2="10" />
        <line x1="14" y1="10" x2="16" y2="10" />
        <line x1="8" y1="14" x2="10" y2="14" />
        <line x1="14" y1="14" x2="16" y2="14" />
        <line x1="8" y1="18" x2="10" y2="18" />
        <line x1="14" y1="18" x2="16" y2="18" />
      </svg>
    ),
  },
};

export default function HomePage() {
  return (
    <div className={styles.root}>
      <p className={styles.lead}>
        Explore partner products the way you would on a marketplace — open a category, compare
        options, then continue on the bank’s own website.
      </p>

      <div className={styles.grid}>
        {PARTNER_CATEGORIES.map((cat) => {
          const visual = CATEGORY_ICONS[cat.id];
          return (
            <Link key={cat.id} to={cat.path} className={styles.cardBtn}>
              <span
                className={`${styles.cardIcon} ${visual?.tone === 'green' ? styles.cardIconGreen : ''}`}
              >
                {visual?.icon}
              </span>
              <span className={styles.cardEyebrow}>Category</span>
              <span className={styles.cardTitle}>{cat.title}</span>
              <span className={styles.cardBlurb}>{cat.blurb}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
