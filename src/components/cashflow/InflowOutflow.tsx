import { inflows, outflows, inflowMonthBars, outflowMonthBars, upcomingItems } from '../../data/cashflow';
import styles from './InflowOutflow.module.css';

export default function InflowOutflow() {
  return (
    <>
      {/* AI Banner */}
      <div className={styles.askBanner}>
        <div className={styles.askBannerIcon}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </div>
        <div className={styles.askBannerContent}>
          <div className={styles.askBannerQ}>"Can I afford to hire a new server next month?"</div>
          <div className={styles.askBannerA}>
            <strong>Yes, comfortably.</strong> At{' '}
            <span className={styles.num}>$18/hr × 30hrs/week</span>, you'd add ~$2,340/mo in payroll. Your 30-day forecast shows{' '}
            <span className={styles.num}>+$4,480</span> in net cash even with payroll — leaves a $2,140 buffer above your historical minimum.
          </div>
        </div>
      </div>

      {/* Inflow / Outflow Cards */}
      <div className={styles.grid2}>
        {/* INFLOWS */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={`${styles.cardIcon} ${styles.in}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div className={styles.cardTitle}>Money in</div>
              <div className={styles.cardSubtitle}>March · vs Feb · 3-mo avg</div>
            </div>
          </div>
          <div className={styles.cardBig}>$58,234</div>
          <div className={styles.cardMeta}>
            <span className={`${styles.pill} ${styles.up}`}>▲ 12.4% vs Feb</span>
            <span className={styles.cardMetaText}>3-mo avg: $52,840</span>
          </div>
          <div className={styles.breakdown}>
            {inflows.map((item) => (
              <div key={item.label} className={styles.breakdownRow}>
                <div className={styles.breakdownLabel}>{item.label}</div>
                <div className={styles.breakdownTrack}>
                  <div className={styles.breakdownFill} style={{ width: item.width, background: item.color }} />
                </div>
                <div className={styles.breakdownValue}>{item.value}</div>
              </div>
            ))}
          </div>
          <div className={styles.monthBars}>
            <div className={styles.monthBarsLabel}>Last 3 months</div>
            <svg viewBox="0 0 360 80" preserveAspectRatio="none" style={{ width: '100%', height: 80 }}>
              {inflowMonthBars.map((bar) => (
                <g key={bar.label}>
                  <rect x={bar.x} y={bar.y} width="60" height={bar.height} rx={bar.rx} fill={bar.fill} />
                  <text x={bar.x + 30} y={bar.y - 4} textAnchor="middle" fontFamily="Inter" fontSize="10" fill="#64748B" fontWeight="600">{bar.value}</text>
                  <text x={bar.x + 30} y="74" textAnchor="middle" fontFamily="Inter" fontSize="10" fill={bar.textFill} fontWeight="700">{bar.label}</text>
                </g>
              ))}
              <line x1="20" y1="32" x2="240" y2="32" stroke="#B45309" strokeWidth="1.5" strokeDasharray="3 2" />
              <text x="290" y="35" fontFamily="Inter" fontSize="10" fill="#B45309" fontWeight="700">3-mo avg</text>
              <text x="290" y="48" fontFamily="Inter" fontSize="11" fill="#B45309" fontWeight="700">$52,858</text>
            </svg>
          </div>
        </div>

        {/* OUTFLOWS */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={`${styles.cardIcon} ${styles.out}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <polyline points="19 12 12 19 5 12" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div className={styles.cardTitle}>Money out</div>
              <div className={styles.cardSubtitle}>March · vs Feb · 3-mo avg</div>
            </div>
          </div>
          <div className={styles.cardBig}>$47,521</div>
          <div className={styles.cardMeta}>
            <span className={`${styles.pill} ${styles.down}`}>▲ 15.2% vs Feb</span>
            <span className={styles.cardMetaText}>3-mo avg: $42,180</span>
          </div>
          <div className={styles.breakdown}>
            {outflows.map((item) => (
              <div key={item.label} className={styles.breakdownRow} style={item.opacity ? { opacity: item.opacity } : undefined}>
                <div className={styles.breakdownLabel}>{item.label}</div>
                <div className={styles.breakdownTrack}>
                  <div className={styles.breakdownFill} style={{ width: item.width, background: item.color }} />
                </div>
                <div className={styles.breakdownValue}>{item.value}</div>
              </div>
            ))}
          </div>
          <div className={styles.monthBars}>
            <div className={styles.monthBarsLabel}>Last 3 months</div>
            <svg viewBox="0 0 360 80" preserveAspectRatio="none" style={{ width: '100%', height: 80 }}>
              {outflowMonthBars.map((bar) => (
                <g key={bar.label}>
                  <rect x={bar.x} y={bar.y} width="60" height={bar.height} rx={bar.rx} fill={bar.fill} />
                  <text x={bar.x + 30} y={bar.y - 4} textAnchor="middle" fontFamily="Inter" fontSize="10" fill="#64748B" fontWeight="600">{bar.value}</text>
                  <text x={bar.x + 30} y="74" textAnchor="middle" fontFamily="Inter" fontSize="10" fill={bar.textFill} fontWeight="700">{bar.label}</text>
                </g>
              ))}
              <line x1="20" y1="36" x2="240" y2="36" stroke="#B45309" strokeWidth="1.5" strokeDasharray="3 2" />
              <text x="290" y="39" fontFamily="Inter" fontSize="10" fill="#B45309" fontWeight="700">3-mo avg</text>
              <text x="290" y="52" fontFamily="Inter" fontSize="11" fill="#B45309" fontWeight="700">$42,500</text>
            </svg>
          </div>
        </div>
      </div>

      {/* Upcoming */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardIcon} style={{ background: 'var(--brand-tint)', color: 'var(--brand)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div className={styles.cardTitle}>Next 14 days</div>
            <div className={styles.cardSubtitle}>What's hitting your account · sorted by date</div>
          </div>
        </div>
        <div className={styles.upcomingList}>
          {upcomingItems.map((item, i) => (
            <div key={i} className={styles.upcomingItem}>
              <div className={styles.upcomingDate}>
                <div className={styles.upcomingDay}>{item.day}</div>
                <div className={styles.upcomingMo}>{item.month}</div>
              </div>
              <div className={styles.upcomingBody}>
                <div className={styles.upcomingTitle}>{item.title}</div>
                <div className={styles.upcomingSub}>{item.sub}</div>
              </div>
              <div className={`${styles.upcomingAmount} ${styles[item.type]}`}>{item.amount}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
