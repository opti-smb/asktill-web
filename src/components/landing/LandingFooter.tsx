import Logo from '../common/Logo';
import styles from './landingV2.module.css';

export default function LandingFooter() {
  return (
    <footer className={styles.footer}>
      <div className="wrap">
        <div className={styles.footerGrid}>
          <div>
            <div style={{ marginBottom: 12 }}>
              <Logo size={30} />
            </div>
            <div className={styles.footerTagline}>Financial clarity for US small businesses.</div>
          </div>
          <div>
            <div className={styles.footerColTitle}>Product</div>
            <a className={styles.footerLink} href="#at-letter">
              AT Letter
            </a>
            <a className={styles.footerLink} href="#rewards">
              AT Rewards
            </a>
            <a className={styles.footerLink} href="#partners">
              Partner services
            </a>
            <a className={styles.footerLink} href="#pricing">
              Pricing
            </a>
          </div>
          <div>
            <div className={styles.footerColTitle}>Company</div>
            <a className={styles.footerLink} href="#">
              About
            </a>
            <a className={styles.footerLink} href="#">
              Privacy policy
            </a>
            <a className={styles.footerLink} href="#">
              Terms of service
            </a>
            <a className={styles.footerLink} href="#partners">
              Partner program
            </a>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>© 2026 Asktill, Inc. — Delaware C Corporation</span>
          <span>Not financial advice. For informational purposes only.</span>
        </div>
      </div>
    </footer>
  );
}
