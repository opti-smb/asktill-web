import { useCallback, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import Logo from '../common/Logo';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_DASHBOARD_PATH } from '../../lib/pendingPdfDownload';

import FloatingAskButton from './FloatingAskButton';
import UserAccountMenu from './UserAccountMenu';

import styles from './DashboardNav.module.css';

/** Brief delay so sweeping across tabs doesn’t thrash navigation. */
const HOVER_NAV_MS = 120;

export default function DashboardNav() {
  const { isAuth, ready } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAtLetterRoute = /^\/dashboard(?:\/at-letter)?\/?$/.test(pathname);
  const isAtLedgerRoute = pathname.startsWith('/dashboard/at-ledger');
  const isCalculatorsRoute = pathname.startsWith('/dashboard/calculators');
  const isChargebacksRoute = pathname.startsWith('/dashboard/chargebacks');
  const isChannelPartnersRoute = pathname.startsWith('/dashboard/channel-partners');
  const isRewardsRoute = pathname.startsWith('/dashboard/rewards');
  const isSourcesRoute = pathname.startsWith('/dashboard/sources');

  // Prevent document scroll so left nav names never move with the page.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);

  const clearHoverTimer = useCallback(() => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);

  const goOnHover = useCallback(
    (to: string, alreadyThere: boolean) => {
      clearHoverTimer();
      if (alreadyThere) return;
      hoverTimer.current = setTimeout(() => {
        navigate(to);
      }, HOVER_NAV_MS);
    },
    [clearHoverTimer, navigate],
  );

  return (
    <div className={styles.shell}>
      <nav className={styles.sidebar} aria-label="Main">
        <div className={styles.sidebarTop}>
          <Logo to={ready && isAuth ? DEFAULT_DASHBOARD_PATH : '/'} size={42} large />
          <div className={styles.navTabs} onMouseLeave={clearHoverTimer}>
            <NavLink
              to={DEFAULT_DASHBOARD_PATH}
              className={({ isActive }) => `${styles.navTab} ${isActive ? styles.active : ''}`}
              onMouseEnter={() => goOnHover(DEFAULT_DASHBOARD_PATH, isAtLetterRoute)}
            >
              Business Brief
            </NavLink>

            <NavLink
              to="/dashboard/at-ledger"
              end={false}
              className={() => `${styles.navTab} ${isAtLedgerRoute ? styles.active : ''}`}
              onMouseEnter={() => goOnHover('/dashboard/at-ledger', isAtLedgerRoute)}
            >
              Financials
            </NavLink>

            <NavLink
              to="/dashboard/calculators"
              className={({ isActive }) => `${styles.navTab} ${isActive ? styles.active : ''}`}
              onMouseEnter={() => goOnHover('/dashboard/calculators', isCalculatorsRoute)}
            >
              Business Health
            </NavLink>

            <NavLink
              to="/dashboard/chargebacks"
              className={({ isActive }) => `${styles.navTab} ${isActive ? styles.active : ''}`}
              onMouseEnter={() => goOnHover('/dashboard/chargebacks', isChargebacksRoute)}
            >
              Money Reclaimed
            </NavLink>

            <NavLink
              to="/dashboard/channel-partners"
              className={({ isActive }) => `${styles.navTab} ${isActive ? styles.active : ''}`}
              onMouseEnter={() =>
                goOnHover('/dashboard/channel-partners', isChannelPartnersRoute)
              }
            >
              Business Services
            </NavLink>

            <NavLink
              to="/dashboard/rewards"
              className={({ isActive }) => `${styles.navTab} ${isActive ? styles.active : ''}`}
              onMouseEnter={() => goOnHover('/dashboard/rewards', isRewardsRoute)}
            >
              Save Money
            </NavLink>

            <NavLink
              to="/dashboard/sources"
              className={({ isActive }) => `${styles.navTab} ${isActive ? styles.active : ''}`}
              onMouseEnter={() => goOnHover('/dashboard/sources', isSourcesRoute)}
            >
              Connect Accounts
            </NavLink>
          </div>
        </div>

        <div className={styles.sidebarBottom}>
          <UserAccountMenu variant="sidebar" menuPlacement="above" />
        </div>
      </nav>

      <div className={styles.pageBody}>
        <Outlet />
      </div>

      <FloatingAskButton />
    </div>
  );
}
