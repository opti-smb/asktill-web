import { useCallback, useEffect, useRef } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';

import styles from './AtLedgerSectionLayout.module.css';

const HOVER_NAV_MS = 120;
const LEDGER_HUB = '/dashboard/at-ledger';

/** Thin UI chrome above ledger section pages — back to the AT Ledger hub. */
export default function AtLedgerSectionLayout() {
  const navigate = useNavigate();
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHoverTimer = useCallback(() => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);

  const goBackOnHover = useCallback(() => {
    clearHoverTimer();
    hoverTimer.current = setTimeout(() => {
      navigate(LEDGER_HUB);
    }, HOVER_NAV_MS);
  }, [clearHoverTimer, navigate]);

  useEffect(() => () => clearHoverTimer(), [clearHoverTimer]);

  return (
    <>
      <div className={styles.backBar}>
        <div className="wrap">
          <Link
            to={LEDGER_HUB}
            className={styles.backLink}
            onMouseEnter={goBackOnHover}
            onMouseLeave={clearHoverTimer}
          >
            ← Back to AT Ledger
          </Link>
        </div>
      </div>
      <Outlet />
    </>
  );
}
