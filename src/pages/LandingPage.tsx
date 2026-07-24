import { useEffect } from 'react';

import { Link } from 'react-router-dom';

import Logo from '../components/common/Logo';

import { useAuth } from '../context/AuthContext';

import TopBanner from '../components/landing/TopBanner';

import HeroSection from '../components/landing/HeroSection';

import HowItWorks from '../components/landing/HowItWorks';

import AtLetterSection from '../components/landing/AtLetterSection';

import RewardsSection from '../components/landing/RewardsSection';

import PartnersSection from '../components/landing/PartnersSection';

import PricingSection from '../components/landing/PricingSection';

import LandingCta from '../components/landing/LandingCta';

import LandingFooter from '../components/landing/LandingFooter';

import { warmupServices } from '../lib/api';

import v2 from '../components/landing/landingV2.module.css';

import styles from './LandingPage.module.css';



export default function LandingPage() {

  const { isAuth, ready } = useAuth();



  useEffect(() => {

    warmupServices();

  }, []);



  return (

    <div className={styles.page}>

      <TopBanner />



      <header>

        <div className="wrap">

          <nav className={styles.nav}>

            <Logo to={ready && isAuth ? '/dashboard/at-letter' : '/'} />

            <div className={styles.navBtns}>

              {ready && isAuth ? (

                <>

                  <Link to="/onboarding" className={v2.btnO}>

                    Upload

                  </Link>

                  <Link to="/dashboard/at-letter" className={v2.btnP}>

                    Dashboard

                  </Link>

                </>

              ) : (

                <>

                  <button type="button" className={v2.btnO}>

                    For partners

                  </button>

                  <Link to="/register" className={v2.btnP}>

                    Get started

                  </Link>

                </>

              )}

            </div>

          </nav>

        </div>

      </header>



      <main>

        <HeroSection />

        <div className="wrap">

          <hr className={v2.div} />

        </div>

        <HowItWorks />

        <AtLetterSection />

        <RewardsSection />
        <PartnersSection />
        <div className="wrap">
          <hr className={v2.div} />
        </div>
        <PricingSection />
        <LandingCta />

      </main>



      <LandingFooter />

    </div>

  );

}

