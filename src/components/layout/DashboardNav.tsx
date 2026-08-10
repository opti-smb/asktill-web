import { useEffect } from 'react';
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

  const isAtLedgerRoute = pathname.startsWith('/dashboard/at-ledger');

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

  return (
    <div className={styles.shell}>
      <nav className={styles.sidebar} aria-label="Main">
        <div className={styles.sidebarTop}>
          <Logo to={ready && isAuth ? DEFAULT_DASHBOARD_PATH : '/'} size={42} large />
          <div className={styles.navTabs}>
            <NavLink
              to={DEFAULT_DASHBOARD_PATH}
              end
              className={({ isActive }) => `${styles.navTab} ${isActive ? styles.active : ''}`}
            >
              Business Brief
            </NavLink>

            <NavLink
              to="/dashboard/at-ledger"
              end={false}
              className={() => `${styles.navTab} ${isAtLedgerRoute ? styles.active : ''}`}
            >
              Financials
            </NavLink>

            <NavLink
              to="/dashboard/calculators"
              className={({ isActive }) => `${styles.navTab} ${isActive ? styles.active : ''}`}
            >
              Business Health
            </NavLink>

            <NavLink
              to="/dashboard/chargebacks"
              className={({ isActive }) => `${styles.navTab} ${isActive ? styles.active : ''}`}
            >
              Money Reclaimed
            </NavLink>

            <NavLink
              to="/dashboard/channel-partners"
              className={({ isActive }) => `${styles.navTab} ${isActive ? styles.active : ''}`}
            >
              Business Services
            </NavLink>

            <NavLink
              to="/dashboard/rewards"
              className={({ isActive }) => `${styles.navTab} ${isActive ? styles.active : ''}`}
            >
              Save Money
            </NavLink>

            <NavLink
              to="/dashboard/sources"
              className={({ isActive }) => `${styles.navTab} ${isActive ? styles.active : ''}`}
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
