import { NavLink, Outlet } from 'react-router-dom';

import Logo from '../common/Logo';
import { useAuth } from '../../context/AuthContext';

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

            <Logo to={ready && isAuth ? '/dashboard/overview' : '/'} />

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

                to="/dashboard/at-letter"

                className={({ isActive }) =>

                  `${styles.navTab} ${isActive ? styles.active : ''}`

                }

              >

                AT Letter

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


