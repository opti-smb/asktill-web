import { NavLink, Outlet, useLocation } from 'react-router-dom';

import Logo from '../common/Logo';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_DASHBOARD_PATH } from '../../lib/pendingPdfDownload';

import FloatingAskButton from './FloatingAskButton';
import UserAccountMenu from './UserAccountMenu';

import styles from './DashboardNav.module.css';

export default function DashboardNav() {
  const { isAuth, ready } = useAuth();
  const { pathname } = useLocation();
  const isAtLetterRoute = /^\/dashboard(?:\/at-letter)?\/?$/.test(pathname);
  const isAtLedgerRoute = pathname.startsWith('/dashboard/at-ledger');
  const isCalculatorsRoute = pathname.startsWith('/dashboard/calculators');
  const isChannelPartnersRoute = pathname.startsWith('/dashboard/channel-partners');
  const isProfileRoute = pathname.startsWith('/dashboard/profile');
  const isSourcesRoute = pathname.startsWith('/dashboard/sources');
  // Outer page shell + inner capped viewport scroll for dashboard pages.
  const usePageScrollShell =
    isAtLetterRoute ||
    isAtLedgerRoute ||
    isCalculatorsRoute ||
    isChannelPartnersRoute ||
    isProfileRoute ||
    isSourcesRoute;

  return (
    <div className={usePageScrollShell ? styles.shellAtLetter : styles.shell}>
      <nav className={`${styles.nav} ${usePageScrollShell ? styles.navSticky : ''}`}>
        <div className="wrap">
          <div className={styles.navInner}>
            <Logo to={ready && isAuth ? DEFAULT_DASHBOARD_PATH : '/'} />

            <div className={styles.navTabs}>
              <NavLink
                to={DEFAULT_DASHBOARD_PATH}
                className={({ isActive }) => `${styles.navTab} ${isActive ? styles.active : ''}`}
              >
                AT Letter
              </NavLink>

              <NavLink
                to="/dashboard/at-ledger"
                end={false}
                className={() => `${styles.navTab} ${isAtLedgerRoute ? styles.active : ''}`}
              >
                AT Ledger
              </NavLink>

              <NavLink
                to="/dashboard/calculators"
                className={({ isActive }) => `${styles.navTab} ${isActive ? styles.active : ''}`}
              >
                AT Calculators
              </NavLink>

              <NavLink
                to="/dashboard/channel-partners"
                className={({ isActive }) => `${styles.navTab} ${isActive ? styles.active : ''}`}
              >
                AT Channel partners
              </NavLink>

              <NavLink
                to="/dashboard/sources"
                className={({ isActive }) => `${styles.navTab} ${isActive ? styles.active : ''}`}
              >
                Sources
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
