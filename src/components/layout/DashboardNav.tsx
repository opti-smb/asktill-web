import { NavLink, Outlet } from 'react-router-dom';

import Logo from '../common/Logo';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_DASHBOARD_PATH } from '../../lib/pendingPdfDownload';

import FloatingAskButton from './FloatingAskButton';
import UserAccountMenu from './UserAccountMenu';

import styles from './DashboardNav.module.css';



export default function DashboardNav() {
  const { isAuth, ready } = useAuth();

  return (

    <>

      <nav className={styles.nav}>

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

      <Outlet />

      <FloatingAskButton />

    </>

  );

}


