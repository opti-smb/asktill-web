import { useCallback, useRef } from 'react';
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
  const isChannelPartnersRoute = pathname.startsWith('/dashboard/channel-partners');
  const isRewardsRoute = pathname.startsWith('/dashboard/rewards');
  const isProfileRoute = pathname.startsWith('/dashboard/profile');
  const isSourcesRoute = pathname.startsWith('/dashboard/sources');
  const usePageScrollShell =
    isAtLetterRoute ||
    isAtLedgerRoute ||
    isCalculatorsRoute ||
    isChannelPartnersRoute ||
    isRewardsRoute ||
    isProfileRoute ||
    isSourcesRoute;

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
    <div className={usePageScrollShell ? styles.shellAtLetter : styles.shell}>
      <nav className={`${styles.nav} ${usePageScrollShell ? styles.navSticky : ''}`}>
        <div className="wrap">
          <div className={styles.navInner}>
            <Logo to={ready && isAuth ? DEFAULT_DASHBOARD_PATH : '/'} />

            <div className={styles.navTabs} onMouseLeave={clearHoverTimer}>
              <NavLink
                to={DEFAULT_DASHBOARD_PATH}
                className={({ isActive }) => `${styles.navTab} ${isActive ? styles.active : ''}`}
                onMouseEnter={() => goOnHover(DEFAULT_DASHBOARD_PATH, isAtLetterRoute)}
              >
                AT Letter
              </NavLink>

              <NavLink
                to="/dashboard/at-ledger"
                end={false}
                className={() => `${styles.navTab} ${isAtLedgerRoute ? styles.active : ''}`}
                onMouseEnter={() => goOnHover('/dashboard/at-ledger', isAtLedgerRoute)}
              >
                AT Ledger
              </NavLink>

              <NavLink
                to="/dashboard/calculators"
                className={({ isActive }) => `${styles.navTab} ${isActive ? styles.active : ''}`}
                onMouseEnter={() => goOnHover('/dashboard/calculators', isCalculatorsRoute)}
              >
                AT Calculators
              </NavLink>

              <NavLink
                to="/dashboard/channel-partners"
                className={({ isActive }) => `${styles.navTab} ${isActive ? styles.active : ''}`}
                onMouseEnter={() =>
                  goOnHover('/dashboard/channel-partners', isChannelPartnersRoute)
                }
              >
                AT Channel partners
              </NavLink>

              <NavLink
                to="/dashboard/rewards"
                className={({ isActive }) => `${styles.navTab} ${isActive ? styles.active : ''}`}
                onMouseEnter={() => goOnHover('/dashboard/rewards', isRewardsRoute)}
              >
                AT Rewards
              </NavLink>

              <NavLink
                to="/dashboard/sources"
                className={({ isActive }) => `${styles.navTab} ${isActive ? styles.active : ''}`}
                onMouseEnter={() => goOnHover('/dashboard/sources', isSourcesRoute)}
              >
                AT Uploads
              </NavLink>
            </div>

            <UserAccountMenu />
          </div>
        </div>
      </nav>

      <div className={usePageScrollShell ? styles.pageBodyAtLetter : styles.pageBody}>
        <Outlet />
      </div>

      <FloatingAskButton />
    </div>
  );
}
