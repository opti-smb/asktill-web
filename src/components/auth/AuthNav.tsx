import Logo from '../common/Logo';
import styles from './AuthNav.module.css';

export type AuthNavActive = 'signin' | 'signup';

/** Auth header — logo only (no Sign up nav). Account creation is offered after a failed login. */
export default function AuthNav({ active: _active }: { active: AuthNavActive }) {
  return (
    <nav className={styles.nav}>
      <div className={`wrap ${styles.navInner}`}>
        <Logo size={28} />
      </div>
    </nav>
  );
}
