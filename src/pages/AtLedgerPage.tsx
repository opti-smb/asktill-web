import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import SectionHeader from '../components/layout/SectionHeader';

import styles from './AtLedgerPage.module.css';

const HOVER_NAV_MS = 120;

const ICON_PROPS = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** Clear stroke icons — same family as AT Uploads. */
const LEDGER_ICONS = {
  cashflow: (
    <svg {...ICON_PROPS} aria-hidden>
      {/* Money in / out arrows */}
      <path d="M12 2v20" />
      <path d="M17 7l-5-5-5 5" />
      <path d="M7 17l5 5 5-5" />
      <path d="M5 12h14" />
    </svg>
  ),
  reconciliation: (
    <svg {...ICON_PROPS} aria-hidden>
      {/* Balance / match scale */}
      <path d="M12 3v18" />
      <path d="M5 8h14" />
      <path d="M5 8l-3 7h6l-3-7" />
      <path d="M19 8l-3 7h6l-3-7" />
    </svg>
  ),
  overview: (
    <svg {...ICON_PROPS} aria-hidden>
      {/* KPI bars */}
      <line x1="6" y1="20" x2="6" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="18" y1="20" x2="18" y2="14" />
      <line x1="3" y1="20" x2="21" y2="20" />
    </svg>
  ),
  reports: (
    <svg {...ICON_PROPS} aria-hidden>
      {/* Clipboard report */}
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="16" x2="14" y2="16" />
    </svg>
  ),
} as const;

const LEDGER_BOXES: ReadonlyArray<{
  id: keyof typeof LEDGER_ICONS;
  title: string;
  blurb: string;
  path: string;
  icon: ReactNode;
}> = [
  {
    id: 'cashflow',
    title: 'Cash Flow',
    blurb: 'Forecast and inflow / outflow from your statements.',
    path: 'cashflow',
    icon: LEDGER_ICONS.cashflow,
  },
  {
    id: 'reconciliation',
    title: 'Reconciliation',
    blurb: 'Match channels and review flagged items.',
    path: 'reconciliation',
    icon: LEDGER_ICONS.reconciliation,
  },
  {
    id: 'overview',
    title: 'Overview',
    blurb: 'KPIs, key questions, and where your money went.',
    path: 'overview',
    icon: LEDGER_ICONS.overview,
  },
  {
    id: 'reports',
    title: 'Reports',
    blurb: 'Month and week reports, downloads, and history.',
    path: 'reports',
    icon: LEDGER_ICONS.reports,
  },
];

/** AT Ledger hub — boxes open the same pages as the old top-level tabs. */
export default function AtLedgerPage() {
  const navigate = useNavigate();
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHoverTimer = useCallback(() => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);

  const goOnHover = useCallback(
    (path: string) => {
      clearHoverTimer();
      hoverTimer.current = setTimeout(() => {
        navigate(path);
      }, HOVER_NAV_MS);
    },
    [clearHoverTimer, navigate],
  );

  useEffect(() => () => clearHoverTimer(), [clearHoverTimer]);

  return (
    <>
      <SectionHeader
        periodMeta="AT LEDGER"
        title={
          <>
            Your books, <em>in one place.</em>
          </>
        }
      />
      <div className={styles.main}>
        <div className="wrap">
          <div className={styles.card}>
            <div className={styles.scrollViewport}>
              <p className={styles.lead}>
                Hover a section below — Cash Flow, Reconciliation, Overview, and Reports — or click
                to open it.
              </p>
              <div className={styles.grid} onMouseLeave={clearHoverTimer}>
                {LEDGER_BOXES.map((box) => (
                  <Link
                    key={box.id}
                    to={box.path}
                    className={styles.cardBtn}
                    onMouseEnter={() => goOnHover(box.path)}
                  >
                    <span className={styles.cardIcon}>{box.icon}</span>
                    <span className={styles.cardEyebrow}>Ledger</span>
                    <span className={styles.cardTitle}>{box.title}</span>
                    <span className={styles.cardBlurb}>{box.blurb}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
