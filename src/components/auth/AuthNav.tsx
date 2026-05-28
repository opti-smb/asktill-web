import { Link, useLocation } from 'react-router-dom';
import Logo from '../common/Logo';
import styles from './AuthNav.module.css';

export type AuthNavActive = 'signin' | 'signup';

export default function AuthNav({ active }: { active: AuthNavActive }) {
  const location = useLocation();
  const registerTo = { pathname: '/register', state: location.state };

  return (
    <nav className={styles.nav}>
      <div className={`wrap ${styles.navInner}`}>
        <Link to="/" className={styles.logoLink} aria-label="AskTill home">
          <Logo size={28} />
        </Link>
        <div className={styles.navLinks}>
          <Link
            to="/login"
            state={location.state}
            className={`${styles.navLink} ${active === 'signin' ? styles.navLinkActive : ''}`}
            aria-current={active === 'signin' ? 'page' : undefined}
          >
            Sign in
          </Link>
          <Link
            to={registerTo}
            className={`${styles.navLink} ${active === 'signup' ? styles.navLinkActive : ''}`}
            aria-current={active === 'signup' ? 'page' : undefined}
          >
            Sign up
          </Link>
        </div>
      </div>
    </nav>
  );
}
