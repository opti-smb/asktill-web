import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/common/Logo';
import { useAuth } from '../context/AuthContext';
import HeroSection from '../components/landing/HeroSection';
import SourcesStrip from '../components/landing/SourcesStrip';
import ProblemSection from '../components/landing/ProblemSection';
import HowItWorks from '../components/landing/HowItWorks';
import { warmupServices } from '../lib/api';
import styles from './LandingPage.module.css';

export default function LandingPage() {
  const { isAuth, ready } = useAuth();

  useEffect(() => {
    warmupServices();
  }, []);

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className="wrap">
          <div className={styles.navInner}>
            <Logo to={ready && isAuth ? '/dashboard/overview' : '/'} size={32} />
            <div className={styles.navRight}>
              {ready && isAuth ? (
                <>
                  <Link to="/onboarding" className={styles.navLogin}>
                    Upload
                  </Link>
                  <Link to="/dashboard/overview" className={styles.navCta}>
                    Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/login" className={styles.navLogin}>Sign in</Link>
                  <Link to="/register" className={styles.navCta}>Sign up</Link>
                </>
              )}
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
