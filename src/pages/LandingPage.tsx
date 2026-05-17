import { Link } from 'react-router-dom';
import Logo from '../components/common/Logo';
import HeroSection from '../components/landing/HeroSection';
import SourcesStrip from '../components/landing/SourcesStrip';
import ProblemSection from '../components/landing/ProblemSection';
import HowItWorks from '../components/landing/HowItWorks';
import styles from './LandingPage.module.css';

export default function LandingPage() {
  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className="wrap">
          <div className={styles.navInner}>
            <Logo size={32} />
            <div className={styles.navRight}>
              <Link to="/login" className={styles.navLogin}>Sign in</Link>
              <Link to="/signup" className={styles.navCta}>Apply</Link>
            </div>
          </div>
        </div>
      </nav>

      <HeroSection />
      <SourcesStrip />
      <ProblemSection />
      <HowItWorks />
    </div>
  );
}
