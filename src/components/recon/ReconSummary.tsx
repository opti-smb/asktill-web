import { reconSummary } from '../../data/recon';
import type { ReconciliationUiApi } from '../../lib/analyzeResponse';
import { getReconAnswerSections } from './reconAnswerDisplay';
import styles from './ReconSummary.module.css';

interface Props {
  reconciliation?: ReconciliationUiApi | null;
}

export default function ReconSummary({ reconciliation }: Props) {
  const hero = reconciliation?.hero ?? {
    matched: reconSummary.matched,
    total: reconSummary.total,
    in_flight_usd: reconSummary.inFlight,
    in_flight_batches: reconSummary.inFlightBatches,
    flagged: reconSummary.flagged,
    flagged_amount_usd: reconSummary.flaggedAmount,
  };
  const bq = reconciliation?.big_question;
  const answerSections = getReconAnswerSections(bq);
  const buckets = reconciliation?.buckets;
  const health = reconciliation?.health_chart;
  const showCash = Boolean(reconciliation?.hero?.cash_count && reconciliation.hero.cash_count > 0);
  const flaggedAmount = Number(bq?.flagged_usd?.replace(/[$,]/g, '') ?? 0);
  const pendingAtBank = Number(bq?.in_flight_usd?.replace(/[$,]/g, '') ?? 0);
  const refundsAdj = Number(bq?.refunds_usd?.replace(/[$,]/g, '') ?? 0);
  const otherAdj = Number(bq?.other_adjustments_usd?.replace(/[$,]/g, '') ?? 0);

  return (
    <>
      <div className={`${styles.reconHero} ${showCash ? styles.reconHeroFour : ''}`}>
        <div className={styles.reconStatBlock}>
          <div className={styles.reconStatLabel}>Matched</div>
          <div className={`${styles.reconStatNum} ${styles.matched}`}>{hero.matched.toLocaleString()}</div>
          <div className={styles.reconStatSub}>
            {buckets?.matched_meta ?? (
              <>
                of <strong>{hero.total.toLocaleString()}</strong> transactions
              </>
            )}
          </div>
          {reconciliation?.hero?.matched_footnote ? (
            <div className={styles.reconStat3mo}>{reconciliation.hero.matched_footnote}</div>
          ) : null}
        </div>
        <div className={styles.reconDivider} />
        <div className={styles.reconStatBlock}>
          <div className={styles.reconStatLabel}>In flight</div>
          <div className={`${styles.reconStatNum} ${styles.pending}`}>{hero.in_flight_usd}</div>
          <div className={styles.reconStatSub}>
            {buckets?.pending_meta ?? (
              <>
                across <strong>{hero.in_flight_batches} card processor batches</strong>
              </>
            )}
          </div>
          {reconciliation?.hero?.in_flight_footnote ? (
            <div className={styles.reconStat3mo}>{reconciliation.hero.in_flight_footnote}</div>
          ) : null}
        </div>
        {showCash ? (
          <>
            <div className={styles.reconDivider} />
            <div className={styles.reconStatBlock}>
              <div className={styles.reconStatLabel}>Cash on hand</div>
              <div className={`${styles.reconStatNum} ${styles.cash}`}>
                {reconciliation?.hero?.cash_on_hand_usd}
              </div>
              <div className={styles.reconStatSub}>
                {buckets?.cash_meta ?? (
                  <>
                    walk-in sales · <strong>not a bank deposit</strong>
                  </>
                )}
              </div>
            </div>
          </>
        ) : null}
        <div className={styles.reconDivider} />
        <div className={styles.reconStatBlock}>
          <div className={styles.reconStatLabel}>Unmatched</div>
          <div className={`${styles.reconStatNum} ${styles.flagged}`}>{hero.flagged}</div>
          <div className={styles.reconStatSub}>
            {buckets?.flagged_meta ?? (
              <>
                bank/report lines · <strong>{hero.flagged_amount_usd} total</strong>
              </>
            )}
          </div>
          {reconciliation?.hero?.flagged_footnote ? (
            <div className={styles.reconStat3mo}>{reconciliation.hero.flagged_footnote}</div>
          ) : null}
        </div>
      </div>

      <div className={styles.bigQ}>
        <div className={styles.bigQHeader}>
          <span className={styles.bigQTag}>The big question</span>
        </div>
        <div className={styles.bigQTitle}>{bq?.title ?? '"Why does my POS say $58,234 but my bank shows $52,909?"'}</div>

        <div className={styles.decomp}>
          <div className={`${styles.decompSide} ${styles.start}`}>
            <div className={styles.decompSideLabel}>{bq?.sales_side_label ?? 'POS revenue'}</div>
            <div className={styles.decompSideNum}>{bq?.pos_revenue_usd ?? '$58,234'}</div>
            <div className={styles.decompSideSub}>{bq?.pos_revenue_subtitle ?? 'Square + Stripe gross'}</div>
          </div>

          <div className={styles.decompMiddle}>
            <div className={styles.decompFlow}>— equals these components —</div>
            <div className={styles.decompRow}>
              <div className={styles.decompRowLabel}>
                <span className={styles.decompRowDot} style={{ background: 'var(--pos)' }} />
                {bq?.deposited_label ?? 'Deposited to bank in March'}
              </div>
              <div className={styles.decompRowNum} style={{ color: 'var(--pos)' }}>{bq?.deposited_usd ?? '$52,909'}</div>
            </div>
            {pendingAtBank > 0 ? (
              <div className={styles.decompRow}>
                <div className={styles.decompRowLabel}>
                  <span className={styles.decompRowDot} style={{ background: 'var(--warn)' }} />
                  {bq?.in_flight_label ?? 'Pending at bank (net payouts)'}
                </div>
                <div className={styles.decompRowNum} style={{ color: 'var(--warn)' }}>{bq?.in_flight_usd}</div>
              </div>
            ) : null}
            {refundsAdj > 0 ? (
              <div className={styles.decompRow}>
                <div className={styles.decompRowLabel}>
                  <span className={styles.decompRowDot} style={{ background: '#64748B' }} />
                  Refunds (POS + e-commerce reports)
                </div>
                <div className={styles.decompRowNum} style={{ color: '#64748B' }}>{bq?.refunds_usd}</div>
              </div>
            ) : null}
            {otherAdj > 0 ? (
              <div className={styles.decompRow}>
                <div className={styles.decompRowLabel}>
                  <span className={styles.decompRowDot} style={{ background: '#94A3B8' }} />
                  {bq?.other_adjustments_label ?? 'Other report adjustments'}
                </div>
                <div className={styles.decompRowNum} style={{ color: '#94A3B8' }}>{bq?.other_adjustments_usd}</div>
              </div>
            ) : null}
            {bq?.cash_on_hand_usd ? (
              <div className={styles.decompRow}>
                <div className={styles.decompRowLabel}>
                  <span className={styles.decompRowDot} style={{ background: '#B45309' }} />
                  {bq.cash_on_hand_label ?? 'Cash on hand (not a bank deposit)'}
                </div>
                <div className={styles.decompRowNum} style={{ color: '#B45309' }}>{bq.cash_on_hand_usd}</div>
              </div>
            ) : null}
            {(flaggedAmount > 0 || !bq?.cash_on_hand_usd) && (
              <div className={styles.decompRow}>
                <div className={styles.decompRowLabel}>
                  <span className={styles.decompRowDot} style={{ background: 'var(--neg)' }} />
                  {bq?.flagged_label ?? 'Unmatched items'}
                </div>
                <div className={styles.decompRowNum} style={{ color: 'var(--neg)' }}>{bq?.flagged_usd ?? '$0'}</div>
              </div>
            )}
            <div className={styles.decompRow} style={{ background: 'var(--brand-tint)', borderColor: 'var(--brand-soft)' }}>
              <div className={styles.decompRowLabel}>
                <span className={styles.decompRowDot} style={{ background: 'var(--brand)' }} />
                {bq?.fees_label ?? 'Card processor fees'}
              </div>
              <div className={styles.decompRowNum} style={{ color: 'var(--brand-deep)' }}>{bq?.fees_usd ?? '-$1,154'}</div>
            </div>
          </div>

          <div className={`${styles.decompSide} ${styles.end}`}>
            <div className={styles.decompSideLabel}>Bank deposits</div>
            <div className={styles.decompSideNum}>{bq?.bank_deposits_usd ?? '$52,909'}</div>
            <div className={styles.decompSideSub}>{bq?.bank_deposits_subtitle ?? 'Cleared in Chase'}</div>
          </div>
        </div>

        <div className={styles.bigQAnswer}>
          <p className={styles.bigQAnswerLead}>{bq?.answer_lead ?? 'Nothing is missing.'}</p>
          {answerSections.length > 0 ? (
            <div className={styles.bigQSections}>
              {answerSections.map((section) => (
                <div key={section.title} className={styles.bigQSection}>
                  <h4 className={styles.bigQSectionTitle}>{section.title}</h4>
                  <ul
                    className={
                      section.ordered ? styles.bigQBulletsNumbered : styles.bigQBullets
                    }
                  >
                    {section.items.map((line, index) => (
                      <li key={`${section.title}-${index}`}>{line}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p>
              The <span className={styles.bigQNum}>{bq?.answer_gap_usd ?? '$5,325'} gap</span> is fully
              accounted for.
            </p>
          )}
        </div>
      </div>

      <div className={styles.health}>
        <div className={styles.healthTitle}>Reconciliation health <em>· {health?.section_label ?? 'last 3 months'}</em></div>
        {health?.note && (
          <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--muted)' }}>{health.note}</p>
        )}
        <svg style={{ width: '100%', height: 140 }} viewBox="0 0 800 140" preserveAspectRatio="none">
          <line x1="30" y1="10" x2="800" y2="10" stroke="#F1F5F9" strokeWidth="1" />
          <line x1="30" y1="50" x2="800" y2="50" stroke="#F1F5F9" strokeWidth="1" />
          <line x1="30" y1="90" x2="800" y2="90" stroke="#F1F5F9" strokeWidth="1" />
          <line x1="30" y1="130" x2="800" y2="130" stroke="#F1F5F9" strokeWidth="1" />
          <text x="0" y="14" fontFamily="Inter" fontSize="10" fill="#94A3B8">100%</text>
          <text x="0" y="54" fontFamily="Inter" fontSize="10" fill="#94A3B8">99%</text>
          <text x="0" y="94" fontFamily="Inter" fontSize="10" fill="#94A3B8">98%</text>
          <text x="0" y="134" fontFamily="Inter" fontSize="10" fill="#94A3B8">97%</text>
          {(health?.bars?.length ? health.bars : []).map((bar) => (
            <g key={`${bar.label}-${bar.matched_pct_label}`}>
              <rect x={bar.x} y={bar.y} width={bar.width} height={bar.height} rx="3" fill={bar.matched_fill} />
              {bar.pending_height > 0 && (
                <rect x={bar.x} y={bar.pending_y} width={bar.width} height={bar.pending_height} fill={bar.pending_fill} />
              )}
              {bar.flagged_height > 0 && (
                <rect x={bar.x} y={bar.flagged_y} width={bar.width} height={bar.flagged_height} fill={bar.flagged_fill} />
              )}
              <text x={bar.x + bar.width / 2} y={bar.pct_text_y} textAnchor="middle" fontFamily="Inter" fontSize="11" fill="#047857" fontWeight="700">
                {bar.matched_pct_label}
              </text>
              <text x={bar.x + bar.width / 2} y="148" textAnchor="middle" fontFamily="Inter" fontSize="11" fill="#1E40AF" fontWeight="700">
                {bar.label}
              </text>
            </g>
          ))}
          {health?.show_avg_line && health.avg_pct_label && health.avg_line_y != null && (
            <>
              <line x1="50" y1={health.avg_line_y} x2="640" y2={health.avg_line_y} stroke="#B45309" strokeWidth="1.5" strokeDasharray="4 3" />
              <text x="690" y={health.avg_line_y + 4} fontFamily="Inter" fontSize="11" fill="#B45309" fontWeight="700">3-mo avg</text>
              <text x="690" y={health.avg_line_y + 20} fontFamily="Inter" fontSize="13" fill="#B45309" fontWeight="700">{health.avg_pct_label}</text>
            </>
          )}
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
