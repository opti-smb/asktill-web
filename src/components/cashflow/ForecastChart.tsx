import styles from './ForecastChart.module.css';

export default function ForecastChart() {
  return (
    <div className={styles.heroCard}>
      <div className={styles.heroNow}>
        <div className={styles.heroLabel}>Cash on hand · Today</div>
        <div className={styles.heroAmount}>$27,341</div>
        <div className={styles.heroMeta}>
          <span className={`${styles.pill} ${styles.up}`}>▲ $3,205</span>
          <span className={styles.heroMetaText}>vs Feb close</span>
        </div>
        <div className={styles.hero3mo}>
          3-mo avg <strong>$23,950</strong> · trending{' '}
          <span className={styles.pos}>+14% above norm</span>
        </div>
      </div>

      <div className={styles.heroForecast}>
        <div className={styles.forecastLabel}>
          <div className={styles.forecastTitle}>Next 30 days · projected</div>
          <div className={styles.forecastLegend}>
            <span><span className={styles.legendDot} style={{ background: 'var(--ink)' }} />Past</span>
            <span><span className={styles.legendDot} style={{ background: 'var(--brand)' }} />Forecast</span>
            <span><span className={styles.legendDot} style={{ background: 'var(--neg)' }} />Payroll</span>
          </div>
        </div>
        <svg viewBox="0 0 800 220" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 220 }}>
          <defs>
            <linearGradient id="pastGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0B1220" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#0B1220" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="futGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1E40AF" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#1E40AF" stopOpacity="0" />
            </linearGradient>
          </defs>

          <text x="0" y="20" fontFamily="Inter" fontSize="10" fill="#94A3B8">$35K</text>
          <text x="0" y="80" fontFamily="Inter" fontSize="10" fill="#94A3B8">$25K</text>
          <text x="0" y="140" fontFamily="Inter" fontSize="10" fill="#94A3B8">$15K</text>
          <text x="0" y="200" fontFamily="Inter" fontSize="10" fill="#94A3B8">$5K</text>

          <line x1="30" y1="16" x2="800" y2="16" stroke="#F1F5F9" strokeWidth="1" />
          <line x1="30" y1="76" x2="800" y2="76" stroke="#F1F5F9" strokeWidth="1" />
          <line x1="30" y1="136" x2="800" y2="136" stroke="#F1F5F9" strokeWidth="1" />
          <line x1="30" y1="196" x2="800" y2="196" stroke="#F1F5F9" strokeWidth="1" />

          <path d="M 30 130 L 60 120 L 90 135 L 120 110 L 150 95 L 180 105 L 210 80 L 240 90 L 270 75 L 300 85 L 330 70 L 360 80 L 390 65 L 410 60 L 410 220 L 30 220 Z" fill="url(#pastGrad)" />
          <path d="M 30 130 L 60 120 L 90 135 L 120 110 L 150 95 L 180 105 L 210 80 L 240 90 L 270 75 L 300 85 L 330 70 L 360 80 L 390 65 L 410 60" fill="none" stroke="#0B1220" strokeWidth="2.5" />

          <path d="M 410 60 L 440 70 L 470 90 L 500 75 L 530 65 L 560 80 L 590 95 L 620 75 L 650 60 L 680 70 L 710 55 L 740 65 L 770 50 L 800 45 L 800 220 L 410 220 Z" fill="url(#futGrad)" />
          <path d="M 410 60 L 440 70 L 470 90 L 500 75 L 530 65 L 560 80 L 590 95 L 620 75 L 650 60 L 680 70 L 710 55 L 740 65 L 770 50 L 800 45" fill="none" stroke="#1E40AF" strokeWidth="2.5" />

          <line x1="410" y1="16" x2="410" y2="208" stroke="#1E40AF" strokeWidth="1" strokeDasharray="4 4" />
          <text x="412" y="14" fontFamily="Inter" fontSize="10" fill="#1E40AF" fontWeight="700">TODAY</text>
          <circle cx="410" cy="60" r="5" fill="#1E40AF" />

          <circle cx="470" cy="90" r="6" fill="#B91C1C" />
          <text x="470" y="80" textAnchor="middle" fontFamily="Inter" fontSize="9" fill="#B91C1C" fontWeight="700">PAY</text>
          <circle cx="590" cy="95" r="6" fill="#B91C1C" />
          <text x="590" y="85" textAnchor="middle" fontFamily="Inter" fontSize="9" fill="#B91C1C" fontWeight="700">PAY</text>

          <text x="60" y="215" fontFamily="Inter" fontSize="9" fill="#94A3B8">Mar 5</text>
          <text x="180" y="215" fontFamily="Inter" fontSize="9" fill="#94A3B8">Mar 15</text>
          <text x="300" y="215" fontFamily="Inter" fontSize="9" fill="#94A3B8">Mar 25</text>
          <text x="410" y="215" fontFamily="Inter" fontSize="9" fill="#1E40AF" fontWeight="700">Apr 1</text>
          <text x="560" y="215" fontFamily="Inter" fontSize="9" fill="#94A3B8">Apr 15</text>
          <text x="710" y="215" fontFamily="Inter" fontSize="9" fill="#94A3B8">Apr 25</text>
          <text x="785" y="215" fontFamily="Inter" fontSize="9" fill="#1E40AF" fontWeight="700">+30d</text>

          <circle cx="800" cy="45" r="5" fill="#1E40AF" />
          <text x="780" y="35" textAnchor="end" fontFamily="Inter" fontSize="11" fill="#1E40AF" fontWeight="700">$31,820</text>
        </svg>
      </div>
    </div>
  );
}
