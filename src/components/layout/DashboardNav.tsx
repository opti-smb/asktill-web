import { NavLink, Outlet } from 'react-router-dom';

import Logo from '../common/Logo';

import FloatingAskButton from './FloatingAskButton';
import UserAccountMenu from './UserAccountMenu';

import styles from './DashboardNav.module.css';



export default function DashboardNav() {

  return (

    <>

      <nav className={styles.nav}>

        <div className="wrap">

          <div className={styles.navInner}>

            <Logo />

            <div className={styles.navTabs}>

              <NavLink

                to="/dashboard/overview"

                className={({ isActive }) =>

                  `${styles.navTab} ${isActive ? styles.active : ''}`

                }

              >

                Overview

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

                to="/onboarding"

                className={({ isActive }) =>

                  `${styles.navTab} ${isActive ? styles.active : ''}`

                }

              >

                Sources

              </NavLink>

              <NavLink

                to="/dashboard/reports"

                className={({ isActive }) =>

                  `${styles.navTab} ${isActive ? styles.active : ''}`

                }

              >

                Reports

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


