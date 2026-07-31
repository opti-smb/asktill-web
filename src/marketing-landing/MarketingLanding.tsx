import { useEffect } from 'react';
import SmoothScroll from './components/SmoothScroll';
import SnapPages from './components/SnapPages';
import Nav from './components/Nav';
import Hero from './components/Hero';
import ScrollStory from './components/ScrollStory';
import HowItWorks from './components/HowItWorks';
import ProductTabs from './components/ProductTabs';
import RewardsShowcase from './components/RewardsShowcase';
import Features from './components/Features';
import Trust from './components/Trust';
import Pricing from './components/Pricing';
import FinalCta from './components/FinalCta';
import Footer from './components/Footer';
import { warmupServices } from '../lib/api';
import './styles/global.css';

/** New AskTill marketing landing — mounted at `/` only. */
export default function MarketingLanding() {
  useEffect(() => {
    warmupServices();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('asktill-landing-active');
    return () => {
      root.classList.remove('asktill-landing-active');
      root.style.removeProperty('--asktill-design-w');
      root.style.removeProperty('--asktill-scale');
    };
  }, []);

  return (
    <div className="asktill-shell asktill-mkt">
      <Nav />
      <div className="asktill-mkt-scroll">
        <SnapPages />
        <SmoothScroll>
          <main>
            <Hero />
            <ScrollStory />
            <ProductTabs />
            <RewardsShowcase />
            <HowItWorks />
            <Features />
            <Trust />
            <Pricing />
            <FinalCta />
          </main>
          <Footer />
        </SmoothScroll>
      </div>
    </div>
  );
}
