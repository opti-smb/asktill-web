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
  const isCashFlowRoute = pathname.startsWith('/dashboard/cashflow');
  const isReconRoute = pathname.startsWith('/dashboard/reconciliation');
  const isOverviewRoute = pathname.startsWith('/dashboard/analysis');
  const isReportsRoute = pathname.startsWith('/dashboard/reports');
  // Same dual-scroll pattern as Cash Flow / Overview / Reports:
  // outer page scroll (sticky nav) + inner capped viewport scroll.
  const usePageScrollShell =
    isAtLetterRoute || isCashFlowRoute || isReconRoute || isOverviewRoute || isReportsRoute;

  return (

    <div className={usePageScrollShell ? styles.shellAtLetter : styles.shell}>

      <nav className={`${styles.nav} ${usePageScrollShell ? styles.navSticky : ''}`}>

        <div className="wrap">

          <div className={styles.navInner}>

            <Logo to={ready && isAuth ? DEFAULT_DASHBOARD_PATH : '/'} />

            <div className={styles.navTabs}>

              <NavLink

                to={DEFAULT_DASHBOARD_PATH}

                className={({ isActive }) =>

                  `${styles.navTab} ${isActive ? styles.active : ''}`

                }

              >

                AT Letter

              </NavLink>

              <NavLink

                to="/dashboard/cashflow"

                className={({ isActive }) =>

                  `${styles.navTab} ${isActive ? styles.active : ''}`

                }

              >

                Cash flow

              </NavLink>

              <NavLink

                to="/dashboard/reconciliation"

                className={({ isActive }) =>

                  `${styles.navTab} ${isActive ? styles.active : ''}`

                }

              >

                Reconciliation

              </NavLink>

              <NavLink

                to="/dashboard/analysis"

                className={({ isActive }) =>

                  `${styles.navTab} ${isActive ? styles.active : ''}`

                }

              >

                Overview

              </NavLink>

              <NavLink

                to="/dashboard/reports"

                className={({ isActive }) =>

                  `${styles.navTab} ${isActive ? styles.active : ''}`

                }

              >

                Reports

              </NavLink>

              <NavLink

                to="/dashboard/sources"

                className={({ isActive }) =>

                  `${styles.navTab} ${isActive ? styles.active : ''}`

                }

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


