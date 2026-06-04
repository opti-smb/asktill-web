import { Link } from 'react-router-dom';
import styles from './landingV2.module.css';

export default function HeroSection() {
  return (
    <section className={styles.hero}>
      <div className="wrap">
        <div className={styles.heroPill}>
          <i className="ti ti-award" aria-hidden="true" />
          AT Rewards — earn points on every action
        </div>
        <h1 className={`${styles.h1} ${styles.heroTitle}`}>
          Know your finances.
          <br />
          In under a minute.
        </h1>
        <p className={`${styles.bodyLg} ${styles.heroSub}`}>
          Upload a bank statement. Get instant cash flow analysis, risk signals, and a plain-English
          monthly letter. Your file is never stored.
        </p>
        <div className={styles.heroCtas}>
          <Link to="/register" className={`${styles.btnP} ${styles.heroCtaPrimary}`}>
            Get started free
          </Link>
          <a href="#how-it-works" className={`${styles.btnO} ${styles.heroCtaSecondary}`}>
            See how it works
          </a>
        </div>
        <p className={styles.heroFootnote}>
          <strong>5,000+</strong> SMBs analyzed &nbsp;·&nbsp; <strong>No credit card</strong> required
        </p>
      </div>
    </section>
  );
}
