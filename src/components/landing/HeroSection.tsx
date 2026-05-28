import { Link } from 'react-router-dom';
import styles from './HeroSection.module.css';

export default function HeroSection() {
  return (
    <section className={styles.hero}>
      <div className="wrap">
        <div className={styles.heroGrid}>
          <div>
            <span className={styles.tagPill}>Built for owner-operators</span>
            <h1>Free analytics. <em>Real financial services.</em></h1>
            <div className={styles.tagline}>Plain-English answers from your business data.</div>
            <p className={styles.heroSub}>
              Connect your bank, POS, and ecommerce. Get plain-English answers — free, forever. Tap working capital, banking, and cards when you're ready.
            </p>
            <div className={styles.ctaRow}>
              <Link to="/register" className={styles.btnPrimary}>
                Create your account
                <span className={styles.arrow}>→</span>
              </Link>
              <span className={styles.micro}>Free analytics · no card required</span>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <svg
              className={styles.tillIllustration}
              viewBox="0 0 480 420"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label="Cash register illustration"
            >
              <defs>
                <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1E40AF" />
                  <stop offset="100%" stopColor="#1E3A8A" />
                </linearGradient>
                <linearGradient id="baseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1E3A8A" />
                  <stop offset="100%" stopColor="#172554" />
                </linearGradient>
              </defs>
              <rect x="40" y="350" width="400" height="60" rx="4" fill="#E2E8F0" />
              <line x1="40" y1="355" x2="440" y2="355" stroke="#CBD5E1" strokeWidth="1" />

              <g className={styles.tillReceipt}>
                <rect x="195" y="30" width="80" height="160" rx="2" fill="#FAFAFA" stroke="#E2E8F0" />
                <text x="235" y="50" textAnchor="middle" fontFamily="monospace" fontSize="9" fill="#1E40AF" fontWeight="bold">RECEIPT</text>
                <line x1="205" y1="60" x2="265" y2="60" stroke="#CBD5E1" strokeWidth="0.5" strokeDasharray="2 2" />
                <text x="205" y="74" fontFamily="monospace" fontSize="7" fill="#64748B">Coffee</text>
                <text x="265" y="74" textAnchor="end" fontFamily="monospace" fontSize="7" fill="#0B1220">$4.50</text>
                <text x="205" y="88" fontFamily="monospace" fontSize="7" fill="#64748B">Croissant</text>
                <text x="265" y="88" textAnchor="end" fontFamily="monospace" fontSize="7" fill="#0B1220">$3.75</text>
                <text x="205" y="102" fontFamily="monospace" fontSize="7" fill="#64748B">Muffin</text>
                <text x="265" y="102" textAnchor="end" fontFamily="monospace" fontSize="7" fill="#0B1220">$3.25</text>
                <line x1="205" y1="112" x2="265" y2="112" stroke="#CBD5E1" strokeWidth="0.5" />
                <text x="205" y="126" fontFamily="monospace" fontSize="7" fill="#0B1220" fontWeight="bold">TOTAL</text>
                <text x="265" y="126" textAnchor="end" fontFamily="monospace" fontSize="7" fill="#1E40AF" fontWeight="bold">$11.50</text>
                <line x1="205" y1="135" x2="265" y2="135" stroke="#CBD5E1" strokeWidth="0.5" strokeDasharray="2 2" />
                <text x="235" y="150" textAnchor="middle" fontFamily="monospace" fontSize="6" fill="#64748B">Thank you!</text>
                <text x="235" y="162" textAnchor="middle" fontFamily="monospace" fontSize="6" fill="#94A3B8">Mar 15, 2026</text>
                <text x="235" y="176" textAnchor="middle" fontFamily="monospace" fontSize="6" fill="#94A3B8">10:42 AM</text>
                <path d="M 195 190 L 205 184 L 215 190 L 225 184 L 235 190 L 245 184 L 255 190 L 265 184 L 275 190 Z" fill="#FAFAFA" stroke="#E2E8F0" />
              </g>

              <rect x="80" y="200" width="320" height="150" rx="8" fill="url(#bodyGrad)" />
              <rect x="80" y="345" width="320" height="8" fill="url(#baseGrad)" />

              <rect x="170" y="135" width="140" height="70" rx="6" fill="url(#baseGrad)" />
              <rect x="180" y="145" width="120" height="50" rx="3" fill="#0F172A" />
              <text className={styles.tillDisplayText} x="240" y="167" textAnchor="middle" fontFamily="monospace" fontSize="10" fill="#93C5FD" fontWeight="bold">$ 1,847.50</text>
              <text x="240" y="183" textAnchor="middle" fontFamily="monospace" fontSize="7" fill="#60A5FA">TODAY</text>
              <rect x="220" y="195" width="40" height="10" fill="url(#baseGrad)" />

              <rect x="180" y="115" width="120" height="22" rx="3" fill="url(#baseGrad)" />
              <text x="240" y="131" textAnchor="middle" fontFamily="Fraunces,serif" fontSize="13" fill="#93C5FD" fontWeight="600" fontStyle="italic">AskTill</text>

              <g>
                <rect x="100" y="225" width="32" height="24" rx="4" fill="#DBEAFE" />
                <rect x="138" y="225" width="32" height="24" rx="4" fill="#DBEAFE" />
                <rect x="176" y="225" width="32" height="24" rx="4" fill="#DBEAFE" />
                <text x="116" y="241" textAnchor="middle" fontFamily="Inter,sans-serif" fontSize="11" fill="#1E40AF" fontWeight="600">1</text>
                <text x="154" y="241" textAnchor="middle" fontFamily="Inter,sans-serif" fontSize="11" fill="#1E40AF" fontWeight="600">2</text>
                <text x="192" y="241" textAnchor="middle" fontFamily="Inter,sans-serif" fontSize="11" fill="#1E40AF" fontWeight="600">3</text>
                <rect x="100" y="255" width="32" height="24" rx="4" fill="#DBEAFE" />
                <rect x="138" y="255" width="32" height="24" rx="4" fill="#DBEAFE" />
                <rect x="176" y="255" width="32" height="24" rx="4" fill="#DBEAFE" />
                <text x="116" y="271" textAnchor="middle" fontFamily="Inter,sans-serif" fontSize="11" fill="#1E40AF" fontWeight="600">4</text>
                <text x="154" y="271" textAnchor="middle" fontFamily="Inter,sans-serif" fontSize="11" fill="#1E40AF" fontWeight="600">5</text>
                <text x="192" y="271" textAnchor="middle" fontFamily="Inter,sans-serif" fontSize="11" fill="#1E40AF" fontWeight="600">6</text>
                <rect x="100" y="285" width="32" height="24" rx="4" fill="#DBEAFE" />
                <rect x="138" y="285" width="32" height="24" rx="4" fill="#DBEAFE" />
                <rect x="176" y="285" width="32" height="24" rx="4" fill="#DBEAFE" />
                <text x="116" y="301" textAnchor="middle" fontFamily="Inter,sans-serif" fontSize="11" fill="#1E40AF" fontWeight="600">7</text>
                <text x="154" y="301" textAnchor="middle" fontFamily="Inter,sans-serif" fontSize="11" fill="#1E40AF" fontWeight="600">8</text>
                <text x="192" y="301" textAnchor="middle" fontFamily="Inter,sans-serif" fontSize="11" fill="#1E40AF" fontWeight="600">9</text>
              </g>

              <g>
                <rect x="220" y="225" width="80" height="38" rx="4" fill="#93C5FD" />
                <text x="260" y="248" textAnchor="middle" fontFamily="Inter,sans-serif" fontSize="10" fill="#1E3A8A" fontWeight="600">CASH</text>
                <rect x="220" y="269" width="80" height="38" rx="4" fill="#93C5FD" />
                <text x="260" y="292" textAnchor="middle" fontFamily="Inter,sans-serif" fontSize="10" fill="#1E3A8A" fontWeight="600">CARD</text>
                <rect x="220" y="313" width="80" height="26" rx="4" fill="#3B82F6" />
                <text x="260" y="330" textAnchor="middle" fontFamily="Inter,sans-serif" fontSize="9" fill="#FFFFFF" fontWeight="700">TOTAL</text>
              </g>

              <rect x="310" y="280" width="80" height="40" rx="3" fill="url(#baseGrad)" />
              <rect x="320" y="294" width="60" height="12" rx="2" fill="#1E3A8A" />
              <circle cx="345" cy="300" r="2" fill="#93C5FD" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
