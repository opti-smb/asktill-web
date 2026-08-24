import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { ASKTILL_LOGO_SRC } from '../common/Logo';

import styles from './LandingSiteHeader.module.css';

const NAV_ITEMS = [
  { label: 'Overview', hash: '#hero' },
  { label: 'Product', hash: '#suite' },
  { label: 'Solutions', hash: '#problem' },
  { label: 'Partners', hash: '#partnerships' },
  { label: 'Chargebacks', hash: '#chargebacks' },
  { label: 'Pricing', hash: '#pricing' },
  { label: 'Resources', hash: '#at-letter' },
] as const;

export default function LandingSiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`} id="site-header">
      <nav className={`wrap ${styles.nav}`}>
        <Link to="/" className={styles.logo} aria-label="Asktill home">
          <img src={ASKTILL_LOGO_SRC} alt="Asktill" className={styles.logoImg} />
        </Link>

        <ul className={styles.navLinks}>
          {NAV_ITEMS.map((item) => (
            <li key={item.hash}>
              <Link to={`/${item.hash}`}>{item.label}</Link>
            </li>
          ))}
        </ul>

        <div className={styles.navRight}>
          <Link to="/login" className={`btn btn-primary ${styles.navLogin}`}>
            Login
          </Link>
          <Link to="/register" className="btn btn-primary">
            Start Free
          </Link>
        </div>
      </nav>
    </header>
  );
}
