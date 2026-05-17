import { reconSummary } from '../../data/recon';
import styles from './ReconSummary.module.css';

export default function ReconSummary() {
  return (
    <>
      {/* Top stat band */}
      <div className={styles.reconHero}>
        <div className={styles.reconStatBlock}>
          <div className={styles.reconStatLabel}>Matched</div>
          <div className={`${styles.reconStatNum} ${styles.matched}`}>{reconSummary.matched.toLocaleString()}</div>
          <div className={styles.reconStatSub}>of <strong>{reconSummary.total.toLocaleString()}</strong> transactions</div>
          <div className={styles.reconStat3mo}>3-mo avg: 99.7% matched</div>
        </div>
        <div className={styles.reconDivider} />
        <div className={styles.reconStatBlock}>
          <div className={styles.reconStatLabel}>In flight</div>
          <div className={`${styles.reconStatNum} ${styles.pending}`}>{reconSummary.inFlight}</div>
          <div className={styles.reconStatSub}>across <strong>{reconSummary.inFlightBatches} settlement batches</strong></div>
          <div className={styles.reconStat3mo}>3-mo avg: $4,920 pending</div>
        </div>
        <div className={styles.reconDivider} />
        <div className={styles.reconStatBlock}>
          <div className={styles.reconStatLabel}>Needs review</div>
          <div className={`${styles.reconStatNum} ${styles.flagged}`}>{reconSummary.flagged}</div>
          <div className={styles.reconStatSub}>items · <strong>{reconSummary.flaggedAmount} total</strong></div>
          <div className={styles.reconStat3mo}>3-mo avg: 4 flagged/mo</div>
        </div>
      </div>

      {/* Big question */}
      <div className={styles.bigQ}>
        <div className={styles.bigQHeader}>
          <span className={styles.bigQTag}>The big question</span>
        </div>
        <div className={styles.bigQTitle}>"Why does my POS say $58,234 but my bank shows $52,909?"</div>

        <div className={styles.decomp}>
          <div className={`${styles.decompSide} ${styles.start}`}>
            <div className={styles.decompSideLabel}>POS revenue</div>
            <div className={styles.decompSideNum}>$58,234</div>
            <div className={styles.decompSideSub}>Square + Stripe gross</div>
          </div>

          <div className={styles.decompMiddle}>
            <div className={styles.decompFlow}>— equals these components —</div>
            <div className={styles.decompRow}>
              <div className={styles.decompRowLabel}>
                <span className={styles.decompRowDot} style={{ background: 'var(--pos)' }} />
                Deposited to bank in March
              </div>
              <div className={styles.decompRowNum} style={{ color: 'var(--pos)' }}>$52,909</div>
            </div>
            <div className={styles.decompRow}>
              <div className={styles.decompRowLabel}>
                <span className={styles.decompRowDot} style={{ background: 'var(--warn)' }} />
                In flight (settles Apr 1–2)
              </div>
              <div className={styles.decompRowNum} style={{ color: 'var(--warn)' }}>$5,224</div>
            </div>
            <div className={styles.decompRow}>
              <div className={styles.decompRowLabel}>
                <span className={styles.decompRowDot} style={{ background: 'var(--neg)' }} />
                Disputed/flagged
              </div>
              <div className={styles.decompRowNum} style={{ color: 'var(--neg)' }}>$255</div>
            </div>
            <div className={styles.decompRow} style={{ background: 'var(--brand-tint)', borderColor: 'var(--brand-soft)' }}>
              <div className={styles.decompRowLabel}>
                <span className={styles.decompRowDot} style={{ background: 'var(--brand)' }} />
                Card processor fees
              </div>
              <div className={styles.decompRowNum} style={{ color: 'var(--brand-deep)' }}>-$1,154</div>
            </div>
          </div>

          <div className={`${styles.decompSide} ${styles.end}`}>
            <div className={styles.decompSideLabel}>Bank deposits</div>
            <div className={styles.decompSideNum}>$52,909</div>
            <div className={styles.decompSideSub}>Cleared in Chase</div>
          </div>
        </div>

        <div className={styles.bigQAnswer}>
          <strong>Nothing is missing.</strong> The <span className={styles.bigQNum}>$5,325 gap</span> is fully accounted for:{' '}
          <span className={styles.bigQNum}>$5,224</span> in settlement timing,{' '}
          <span className={styles.bigQNum}>$255</span> in 3 disputed charges from Mar 18–22, and{' '}
          <span className={styles.bigQNum}>$1,154</span> in card processor fees. AskTill traced every dollar.
        </div>
      </div>

      {/* Buckets */}
      <div className={styles.buckets}>
        <div className={styles.bucket}>
          <div className={styles.bucketHeader}>
            <div className={`${styles.bucketDot} ${styles.match}`} />
            <div className={styles.bucketTitle}>Auto-matched</div>
          </div>
          <div className={styles.bucketNum}>2,016</div>
          <div className={styles.bucketMeta}>99.85% of transactions · matched within 5min</div>
          <div className={styles.bucketBar}><div className={`${styles.bucketBarFill} ${styles.match}`} style={{ width: '99.85%' }} /></div>
          <div className={styles.bucketPct}>
            <span>vs Feb <strong>99.70%</strong></span>
            <span>3-mo avg <strong>99.7%</strong></span>
          </div>
        </div>

        <div className={styles.bucket}>
          <div className={styles.bucketHeader}>
            <div className={`${styles.bucketDot} ${styles.pending}`} />
            <div className={styles.bucketTitle}>Pending settlement</div>
          </div>
          <div className={styles.bucketNum}>$5,224</div>
          <div className={styles.bucketMeta}>3 batches awaiting bank deposit · clears Apr 1–2</div>
          <div className={styles.bucketBar}><div className={`${styles.bucketBarFill} ${styles.pending}`} style={{ width: '65%' }} /></div>
          <div className={styles.bucketPct}>
            <span>vs Feb <strong>$4,490</strong></span>
            <span>3-mo avg <strong>$4,920</strong></span>
          </div>
        </div>

        <div className={styles.bucket}>
          <div className={styles.bucketHeader}>
            <div className={`${styles.bucketDot} ${styles.flagged}`} />
            <div className={styles.bucketTitle}>Needs review</div>
          </div>
          <div className={styles.bucketNum}>3</div>
          <div className={styles.bucketMeta}>$255 total · 1 dispute, 2 unmatched</div>
          <div className={styles.bucketBar}><div className={`${styles.bucketBarFill} ${styles.flagged}`} style={{ width: '30%' }} /></div>
          <div className={styles.bucketPct}>
            <span>vs Feb <strong>5</strong></span>
            <span>3-mo avg <strong>4</strong></span>
          </div>
        </div>
      </div>

      {/* 3-month health chart */}
      <div className={styles.health}>
        <div className={styles.healthTitle}>Reconciliation health <em>· last 3 months</em></div>
        <svg style={{ width: '100%', height: 140 }} viewBox="0 0 800 140" preserveAspectRatio="none">
          <line x1="30" y1="10" x2="800" y2="10" stroke="#F1F5F9" strokeWidth="1" />
          <line x1="30" y1="50" x2="800" y2="50" stroke="#F1F5F9" strokeWidth="1" />
          <line x1="30" y1="90" x2="800" y2="90" stroke="#F1F5F9" strokeWidth="1" />
          <line x1="30" y1="130" x2="800" y2="130" stroke="#F1F5F9" strokeWidth="1" />
          <text x="0" y="14" fontFamily="Inter" fontSize="10" fill="#94A3B8">100%</text>
          <text x="0" y="54" fontFamily="Inter" fontSize="10" fill="#94A3B8">99%</text>
          <text x="0" y="94" fontFamily="Inter" fontSize="10" fill="#94A3B8">98%</text>
          <text x="0" y="134" fontFamily="Inter" fontSize="10" fill="#94A3B8">97%</text>
          <rect x="80" y="30" width="160" height="100" rx="3" fill="#DCFCE7" />
          <rect x="80" y="125" width="160" height="5" fill="#FEF3C7" />
          <rect x="80" y="128" width="160" height="2" fill="#FEE2E2" />
          <text x="160" y="20" textAnchor="middle" fontFamily="Inter" fontSize="11" fill="#047857" fontWeight="700">99.62%</text>
          <text x="160" y="148" textAnchor="middle" fontFamily="Inter" fontSize="11" fill="#1E40AF" fontWeight="700">Jan</text>
          <rect x="280" y="22" width="160" height="108" rx="3" fill="#A7F3D0" />
          <rect x="280" y="125" width="160" height="5" fill="#FEF3C7" />
          <rect x="280" y="128" width="160" height="2" fill="#FEE2E2" />
          <text x="360" y="14" textAnchor="middle" fontFamily="Inter" fontSize="11" fill="#047857" fontWeight="700">99.71%</text>
          <text x="360" y="148" textAnchor="middle" fontFamily="Inter" fontSize="11" fill="#1E40AF" fontWeight="700">Feb</text>
          <rect x="480" y="14" width="160" height="116" rx="3" fill="#047857" />
          <rect x="480" y="124" width="160" height="5" fill="#B45309" />
          <rect x="480" y="128" width="160" height="2" fill="#B91C1C" />
          <text x="560" y="8" textAnchor="middle" fontFamily="Inter" fontSize="11" fill="#047857" fontWeight="700">99.85%</text>
          <text x="560" y="148" textAnchor="middle" fontFamily="Inter" fontSize="11" fill="#1E40AF" fontWeight="700">Mar</text>
          <line x1="50" y1="20" x2="640" y2="20" stroke="#B45309" strokeWidth="1.5" strokeDasharray="4 3" />
          <text x="690" y="24" fontFamily="Inter" fontSize="11" fill="#B45309" fontWeight="700">3-mo avg</text>
          <text x="690" y="40" fontFamily="Inter" fontSize="13" fill="#B45309" fontWeight="700">99.73%</text>
          <rect x="690" y="80" width="10" height="10" fill="#047857" />
          <text x="705" y="89" fontFamily="Inter" fontSize="10" fill="#0B1220">Matched</text>
          <rect x="690" y="95" width="10" height="10" fill="#B45309" />
          <text x="705" y="104" fontFamily="Inter" fontSize="10" fill="#0B1220">Pending</text>
          <rect x="690" y="110" width="10" height="10" fill="#B91C1C" />
          <text x="705" y="119" fontFamily="Inter" fontSize="10" fill="#0B1220">Flagged</text>
        </svg>
      </div>
    </>
  );
}
