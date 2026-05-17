import styles from './StandardQuestions.module.css';

export default function StandardQuestions() {
  return (
    <div className={styles.standardGrid}>
      {/* Q1: Best day */}
      <div className={styles.standardCard}>
        <div className={styles.standardTag}>Best day</div>
        <div className={styles.standardQ}>"When did the till do its best work?"</div>
        <span className={styles.bigNum}>
          Mar 16<span className={`${styles.bigNumDelta} ${styles.up}`}>$3,835</span>
        </span>
        <div className={styles.standardAnswer}>
          Saturday. <strong>+48% vs typical Saturday.</strong> Walk-ins after 2pm.
        </div>
        <svg viewBox="0 0 280 80" preserveAspectRatio="none" style={{ width: '100%', height: 70, marginTop: 10 }}>
          <rect x="0" y="45" width="6" height="35" fill="#DBEAFE" rx="1" />
          <rect x="9" y="48" width="6" height="32" fill="#DBEAFE" rx="1" />
          <rect x="18" y="40" width="6" height="40" fill="#DBEAFE" rx="1" />
          <rect x="27" y="42" width="6" height="38" fill="#DBEAFE" rx="1" />
          <rect x="36" y="38" width="6" height="42" fill="#DBEAFE" rx="1" />
          <rect x="45" y="28" width="6" height="52" fill="#93C5FD" rx="1" />
          <rect x="54" y="30" width="6" height="50" fill="#93C5FD" rx="1" />
          <rect x="63" y="46" width="6" height="34" fill="#DBEAFE" rx="1" />
          <rect x="72" y="44" width="6" height="36" fill="#DBEAFE" rx="1" />
          <rect x="81" y="38" width="6" height="42" fill="#DBEAFE" rx="1" />
          <rect x="90" y="36" width="6" height="44" fill="#DBEAFE" rx="1" />
          <rect x="99" y="34" width="6" height="46" fill="#DBEAFE" rx="1" />
          <rect x="108" y="22" width="6" height="58" fill="#93C5FD" rx="1" />
          <rect x="117" y="20" width="6" height="60" fill="#93C5FD" rx="1" />
          <rect x="126" y="42" width="6" height="38" fill="#DBEAFE" rx="1" />
          <rect x="135" y="5" width="6" height="75" fill="#1E40AF" rx="1" />
          <rect x="144" y="32" width="6" height="48" fill="#93C5FD" rx="1" />
          <rect x="153" y="44" width="6" height="36" fill="#DBEAFE" rx="1" />
          <rect x="162" y="42" width="6" height="38" fill="#DBEAFE" rx="1" />
          <rect x="171" y="40" width="6" height="40" fill="#DBEAFE" rx="1" />
          <rect x="180" y="38" width="6" height="42" fill="#DBEAFE" rx="1" />
          <rect x="189" y="34" width="6" height="46" fill="#93C5FD" rx="1" />
          <rect x="198" y="32" width="6" height="48" fill="#93C5FD" rx="1" />
          <rect x="207" y="46" width="6" height="34" fill="#DBEAFE" rx="1" />
          <rect x="216" y="44" width="6" height="36" fill="#DBEAFE" rx="1" />
          <rect x="225" y="42" width="6" height="38" fill="#DBEAFE" rx="1" />
          <rect x="234" y="40" width="6" height="40" fill="#DBEAFE" rx="1" />
          <rect x="243" y="36" width="6" height="44" fill="#DBEAFE" rx="1" />
          <rect x="252" y="32" width="6" height="48" fill="#93C5FD" rx="1" />
          <rect x="261" y="30" width="6" height="50" fill="#93C5FD" rx="1" />
          <rect x="270" y="46" width="6" height="34" fill="#DBEAFE" rx="1" />
        </svg>
      </div>

      {/* Q2: Payroll */}
      <div className={styles.standardCard}>
        <div className={styles.standardTag}>Cash runway</div>
        <div className={styles.standardQ}>"Can I cover Friday's payroll?"</div>
        <span className={styles.bigNum}>
          Yes<span className={`${styles.bigNumDelta} ${styles.up}`}>+$2,180</span>
        </span>
        <div className={styles.standardAnswer}>
          Square hits Thu. Stripe lands Fri AM. <strong>$11,420 by 2pm.</strong>
        </div>
        <svg viewBox="0 0 280 80" preserveAspectRatio="none" style={{ width: '100%', height: 70, marginTop: 10 }}>
          <defs>
            <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#047857" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M 0 50 L 40 45 L 80 50 L 120 35 L 160 30 L 200 25 L 240 22 L 280 18 L 280 80 L 0 80 Z" fill="url(#cashGrad)" />
          <path d="M 0 50 L 40 45 L 80 50 L 120 35 L 160 30 L 200 25 L 240 22 L 280 18" fill="none" stroke="#047857" strokeWidth="2.5" />
          <line x1="200" y1="0" x2="200" y2="80" stroke="#B91C1C" strokeWidth="1" strokeDasharray="3 3" />
          <text x="204" y="14" fontFamily="Inter" fontSize="9" fill="#B91C1C" fontWeight="600">Fri payroll</text>
          <circle cx="200" cy="25" r="4" fill="#047857" />
        </svg>
      </div>

      {/* Q3: Anomaly */}
      <div className={styles.standardCard} style={{ borderLeftColor: 'var(--warn)' }}>
        <div className={styles.standardTag} style={{ color: 'var(--warn)' }}>Anomaly</div>
        <div className={styles.standardQ}>"Anything weird this month?"</div>
        <span className={styles.bigNum} style={{ color: 'var(--warn)' }}>
          1 alert<span className={`${styles.bigNumDelta} ${styles.down}`}>$35 fee</span>
        </span>
        <div className={styles.standardAnswer}>
          <strong>Mar 22:</strong> First overdraft fee in 6 months. Payroll timing.
        </div>
        <svg viewBox="0 0 280 80" preserveAspectRatio="none" style={{ width: '100%', height: 70, marginTop: 10 }}>
          <text x="20" y="74" fontFamily="Inter" fontSize="9" fill="#64748B">Oct</text>
          <text x="65" y="74" fontFamily="Inter" fontSize="9" fill="#64748B">Nov</text>
          <text x="110" y="74" fontFamily="Inter" fontSize="9" fill="#64748B">Dec</text>
          <text x="155" y="74" fontFamily="Inter" fontSize="9" fill="#64748B">Jan</text>
          <text x="200" y="74" fontFamily="Inter" fontSize="9" fill="#64748B">Feb</text>
          <text x="245" y="74" fontFamily="Inter" fontSize="9" fill="#B45309" fontWeight="600">Mar</text>
          <line x1="0" y1="55" x2="280" y2="55" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="2 2" />
          <circle cx="30" cy="55" r="4" fill="#DBEAFE" />
          <circle cx="75" cy="55" r="4" fill="#DBEAFE" />
          <circle cx="120" cy="55" r="4" fill="#DBEAFE" />
          <circle cx="165" cy="55" r="4" fill="#DBEAFE" />
          <circle cx="210" cy="55" r="4" fill="#DBEAFE" />
          <circle cx="255" cy="20" r="6" fill="#B45309" />
          <text x="255" y="14" textAnchor="middle" fontFamily="Inter" fontSize="9" fill="#B45309" fontWeight="700">!</text>
        </svg>
      </div>
    </div>
  );
}
