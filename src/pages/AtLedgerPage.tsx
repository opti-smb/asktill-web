import { Link } from 'react-router-dom';

import SectionHeader from '../components/layout/SectionHeader';

import styles from './AtLedgerPage.module.css';

const LEDGER_BOXES = [
  {
    id: 'cashflow',
    title: 'Cash Flow',
    blurb: 'Forecast and inflow / outflow from your statements.',
    path: 'cashflow',
  },
  {
    id: 'reconciliation',
    title: 'Reconciliation',
    blurb: 'Match channels and review flagged items.',
    path: 'reconciliation',
  },
  {
    id: 'overview',
    title: 'Overview',
    blurb: 'KPIs, key questions, and where your money went.',
    path: 'overview',
  },
  {
    id: 'reports',
    title: 'Reports',
    blurb: 'Month and week reports, downloads, and history.',
    path: 'reports',
  },
] as const;

/** AT Ledger hub — boxes open the same pages as the old top-level tabs. */
export default function AtLedgerPage() {
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
                Open a section below — Cash Flow, Reconciliation, Overview, and Reports work the
                same as before.
              </p>
              <div className={styles.grid}>
                {LEDGER_BOXES.map((box) => (
                  <Link key={box.id} to={box.path} className={styles.cardBtn}>
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
