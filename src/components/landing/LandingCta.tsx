import { Link } from 'react-router-dom';
import styles from './landingV2.module.css';

export default function LandingCta() {
  return (
    <div className="wrap">
      <div className={styles.ctaBox}>
        <div className={styles.ctaLogoRow}>
          <div className={styles.ctaLogoIcon}>
            <i className="ti ti-chart-bar" aria-hidden="true" />
          </div>
          <span className={styles.ctaLogoText}>
            ask<span>till</span>
          </span>
        </div>
        <h2 className={styles.ctaTitle}>Ready to know your numbers?</h2>
        <p className={styles.ctaSub}>Start free. Your first AT Letter is on us.</p>
        <div className={styles.ctaBtns}>
          <Link to="/register" className={styles.ctaBtnPrimary}>
            Get started free
          </Link>
          <a href="#partners" className={styles.ctaBtnSecondary}>
            Become a partner
          </a>
        </div>
      </div>
    </div>
  );
}
