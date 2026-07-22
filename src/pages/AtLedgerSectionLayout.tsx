import { Link, Outlet } from 'react-router-dom';

import styles from './AtLedgerSectionLayout.module.css';

/** Thin UI chrome above ledger section pages — back to the AT Ledger hub. */
export default function AtLedgerSectionLayout() {
  return (
    <>
      <div className={styles.backBar}>
        <div className="wrap">
          <Link to="/dashboard/at-ledger" className={styles.backLink}>
            ← Back to AT Ledger
          </Link>
        </div>
      </div>
      <Outlet />
    </>
  );
}
