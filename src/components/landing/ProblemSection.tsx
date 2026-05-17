import { landingStats } from '../../data/landing';
import styles from './ProblemSection.module.css';

export default function ProblemSection() {
  return (
    <section className={styles.section}>
      <div className="wrap">
        <div className={styles.sectionLabel}>The problem</div>
        <h2>Data everywhere. Answers <em>nowhere.</em></h2>
        <div className={styles.problemVisual}>
          <svg className={styles.chaosChart} viewBox="0 0 460 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three disconnected dashboards showing different numbers">
            <rect x="10" y="10" width="170" height="110" rx="8" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />
            <rect x="10" y="10" width="170" height="22" rx="8" fill="#1E40AF" />
            <text x="20" y="25" fontFamily="Inter,sans-serif" fontSize="10" fill="#FFFFFF" fontWeight="600">Square POS</text>
            <text x="20" y="60" fontFamily="Fraunces,serif" fontSize="22" fill="#0B1220" fontWeight="500">$58,234</text>
            <text x="20" y="75" fontFamily="Inter,sans-serif" fontSize="9" fill="#64748B">Gross sales</text>
            <rect x="20" y="88" width="100" height="6" rx="3" fill="#DBEAFE" />
            <rect x="20" y="98" width="70" height="6" rx="3" fill="#DBEAFE" />

            <rect x="195" y="50" width="170" height="110" rx="8" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />
            <rect x="195" y="50" width="170" height="22" rx="8" fill="#1E3A8A" />
            <text x="205" y="65" fontFamily="Inter,sans-serif" fontSize="10" fill="#FFFFFF" fontWeight="600">Chase Bank</text>
            <text x="205" y="100" fontFamily="Fraunces,serif" fontSize="22" fill="#0B1220" fontWeight="500">$52,909</text>
            <text x="205" y="115" fontFamily="Inter,sans-serif" fontSize="9" fill="#64748B">Net deposits</text>
            <rect x="205" y="128" width="100" height="6" rx="3" fill="#DBEAFE" />
            <rect x="205" y="138" width="80" height="6" rx="3" fill="#DBEAFE" />

            <rect x="80" y="180" width="170" height="110" rx="8" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />
            <rect x="80" y="180" width="170" height="22" rx="8" fill="#3B82F6" />
            <text x="90" y="195" fontFamily="Inter,sans-serif" fontSize="10" fill="#FFFFFF" fontWeight="600">Shopify</text>
            <text x="90" y="230" fontFamily="Fraunces,serif" fontSize="22" fill="#0B1220" fontWeight="500">$22,806</text>
            <text x="90" y="245" fontFamily="Inter,sans-serif" fontSize="9" fill="#64748B">Online revenue</text>
            <rect x="90" y="258" width="100" height="6" rx="3" fill="#DBEAFE" />
            <rect x="90" y="268" width="60" height="6" rx="3" fill="#DBEAFE" />

            <circle cx="320" cy="230" r="40" fill="#B91C1C" opacity="0.1" />
            <text x="320" y="248" textAnchor="middle" fontFamily="Fraunces,serif" fontSize="44" fill="#B91C1C" fontWeight="500" fontStyle="italic">?</text>

            <line x1="180" y1="65" x2="195" y2="105" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="195" y1="160" x2="180" y2="200" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" />
          </svg>

          <div className={styles.problemStats}>
            {landingStats.map((stat) => (
              <div key={stat.label} className={styles.problemStat}>
                <div className={styles.problemStatNum}>{stat.num}</div>
                <div className={styles.problemStatText}>
                  <strong>{stat.label}</strong>
                  {stat.sublabel}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
