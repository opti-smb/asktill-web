import { reconSummary } from '../../data/recon';
import type { ReconciliationUiApi } from '../../lib/analyzeResponse';
import styles from './ReconSummary.module.css';

interface Props {
  reconciliation?: ReconciliationUiApi | null;
  hasLiveAnalysis?: boolean;
}

function parseMatchedPct(bucketsPct: string | undefined, matched: number, total: number): number {
  if (bucketsPct) {
    const n = Number(String(bucketsPct).replace(/%/g, '').trim());
    if (!Number.isNaN(n)) return Math.max(0, Math.min(100, n));
  }
  if (total > 0) return Math.round((matched / total) * 10000) / 100;
  return 0;
}

function HealthDonut({
  matchedPct,
  pendingPct,
  flaggedPct,
  note,
}: {
  matchedPct: number;
  pendingPct: number;
  flaggedPct: number;
  note?: string | null;
}) {
  const size = 168;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const m = Math.max(0, Math.min(100, matchedPct));
  const p = Math.max(0, Math.min(100 - m, pendingPct));
  const f = Math.max(0, Math.min(100 - m - p, flaggedPct));
  const dashM = (m / 100) * c;
  const dashP = (p / 100) * c;
  const dashF = (f / 100) * c;

  return (
    <div className={styles.healthCard}>
      <h3 className={styles.panelTitle}>Reconciliation health</h3>
      <div className={styles.donutWrap}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#eef2f7"
            strokeWidth={stroke}
          />
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="#0f8a57"
              strokeWidth={stroke}
              strokeDasharray={`${dashM} ${c - dashM}`}
              strokeLinecap="butt"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="#e0891a"
              strokeWidth={stroke}
              strokeDasharray={`${dashP} ${c - dashP}`}
              strokeDashoffset={-dashM}
              strokeLinecap="butt"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="#c43c3c"
              strokeWidth={stroke}
              strokeDasharray={`${dashF} ${c - dashF}`}
              strokeDashoffset={-(dashM + dashP)}
              strokeLinecap="butt"
            />
          </g>
        </svg>
        <div className={styles.donutCenter}>
          <div className={styles.donutPct}>{m.toFixed(m % 1 === 0 ? 0 : 2)}%</div>
          <div className={styles.donutLabel}>Healthy</div>
        </div>
      </div>
      <ul className={styles.healthLegend}>
        <li>
          <span className={`${styles.legDot} ${styles.legMatched}`} />
          Matched
          <strong>{m.toFixed(2)}%</strong>
        </li>
        <li>
          <span className={`${styles.legDot} ${styles.legPending}`} />
          Pending
          <strong>{p.toFixed(2)}%</strong>
        </li>
        <li>
          <span className={`${styles.legDot} ${styles.legFlagged}`} />
          Flagged
          <strong>{f.toFixed(2)}%</strong>
        </li>
      </ul>
      {note ? <p className={styles.healthNote}>{note}</p> : null}
    </div>
  );
}

export default function ReconSummary({ reconciliation }: Props) {
  const useDemo = false;
  const hero = reconciliation?.hero ?? (useDemo ? {
    matched: reconSummary.matched,
    total: reconSummary.total,
    in_flight_usd: reconSummary.inFlight,
    in_flight_batches: reconSummary.inFlightBatches,
    flagged: reconSummary.flagged,
    flagged_amount_usd: reconSummary.flaggedAmount,
  } : {
    matched: 0,
    total: 0,
    in_flight_usd: '—',
    in_flight_batches: 0,
    flagged: 0,
    flagged_amount_usd: '$0.00',
  });
  const bq = reconciliation?.big_question;
  const buckets = reconciliation?.buckets;
  const health = reconciliation?.health_chart;
  const showCash = Boolean(reconciliation?.hero?.cash_count && reconciliation.hero.cash_count > 0);
  const pendingAtBank = Number(bq?.in_flight_usd?.replace(/[$,]/g, '') ?? 0);
  const priorMonthTotal = Number(
    reconciliation?.prior_month_total_usd?.replace(/[$,]/g, '') ?? 0,
  );
  const priorMonthCount = reconciliation?.prior_month_count ?? 0;
  const refundsAdj = Number(bq?.refunds_usd?.replace(/[$,]/g, '') ?? 0);
  const otherAdj = Number(bq?.other_adjustments_usd?.replace(/[$,]/g, '') ?? 0);

  const matchedPct = parseMatchedPct(buckets?.matched_pct, hero.matched, hero.total);
  const latestBar = health?.bars?.length ? health.bars[health.bars.length - 1] : null;
  const donutMatched = latestBar?.matched_pct ?? matchedPct;
  const donutFlagged =
    hero.total > 0 ? Math.min(100 - donutMatched, (hero.flagged / hero.total) * 100) : 0;
  const donutPending = Math.max(0, 100 - donutMatched - donutFlagged);

  const matchedSub =
    buckets?.matched_meta ??
    (hero.total > 0
      ? `${matchedPct.toFixed(2)}% of transactions matched to bank`
      : 'No transactions in this period');
  const inFlightSub =
    buckets?.pending_meta ??
    (pendingAtBank === 0
      ? 'Net payouts match bank deposits this period'
      : `Across ${hero.in_flight_batches} card processor batch${hero.in_flight_batches === 1 ? '' : 'es'}`);
  const unmatchedSub =
    buckets?.flagged_meta ??
    (hero.flagged === 0
      ? 'No unmatched bank/report lines'
      : `Bank/report lines · ${hero.flagged_amount_usd} total`);

  const bannerText =
    bq?.answer_lead ||
    (hero.flagged === 0 && pendingAtBank === 0
      ? 'Processor deposits match your uploaded reports for this period.'
      : null);

  return (
    <>
      <div className={`${styles.kpiGrid} ${showCash ? styles.kpiGridFour : ''}`}>
        <article className={styles.kpiCard}>
          <span className={`${styles.kpiIcon} ${styles.kpiIconOk}`} aria-hidden>
            <i className="ti ti-circle-check" />
          </span>
          <div className={styles.kpiLabel}>Matched</div>
          <div className={`${styles.kpiValue} ${styles.matched}`}>{hero.matched.toLocaleString()}</div>
          <p className={styles.kpiSub}>{matchedSub}</p>
        </article>

        <article className={styles.kpiCard}>
          <span className={`${styles.kpiIcon} ${styles.kpiIconWarn}`} aria-hidden>
            <i className="ti ti-clock" />
          </span>
          <div className={styles.kpiLabel}>In Flight</div>
          <div className={`${styles.kpiValue} ${styles.pending}`}>{hero.in_flight_usd}</div>
          <p className={styles.kpiSub}>{inFlightSub}</p>
        </article>

        {showCash ? (
          <article className={styles.kpiCard}>
            <span className={`${styles.kpiIcon} ${styles.kpiIconCash}`} aria-hidden>
              <i className="ti ti-cash" />
            </span>
            <div className={styles.kpiLabel}>Cash on hand</div>
            <div className={`${styles.kpiValue} ${styles.cash}`}>
              {reconciliation?.hero?.cash_on_hand_usd}
            </div>
            <p className={styles.kpiSub}>{buckets?.cash_meta ?? 'Walk-in sales · not a bank deposit'}</p>
          </article>
        ) : null}

        <article className={styles.kpiCard}>
          <span className={`${styles.kpiIcon} ${styles.kpiIconBad}`} aria-hidden>
            <i className="ti ti-flag" />
          </span>
          <div className={styles.kpiLabel}>Unmatched</div>
          <div className={`${styles.kpiValue} ${styles.flagged}`}>{hero.flagged}</div>
          <p className={styles.kpiSub}>{unmatchedSub}</p>
        </article>
      </div>

      <div className={styles.midGrid}>
        <section className={styles.summaryCard}>
          <h3 className={styles.panelTitle}>Reconciliation summary</h3>

          <div className={styles.flow}>
            <div className={`${styles.flowSide} ${styles.flowStart}`}>
              <div className={styles.flowSideLabel}>Expected settlement</div>
              <div className={styles.flowSideNum}>{bq?.pos_revenue_usd ?? '—'}</div>
              <div className={styles.flowSideSub}>
                {bq?.pos_revenue_subtitle ?? bq?.sales_side_label ?? 'POS + E-commerce'}
              </div>
            </div>

            <div className={styles.flowMiddle}>
              <div className={styles.flowRow}>
                <div className={styles.flowRowLabel}>
                  <span className={styles.flowDot} style={{ background: '#0f8a57' }} />
                  {bq?.deposited_label ?? 'Deposited to bank'}
                </div>
                <div className={styles.flowRowNum} style={{ color: '#0f8a57' }}>
                  {bq?.deposited_usd ?? '—'}
                </div>
              </div>
              {pendingAtBank > 0 ? (
                <div className={styles.flowRow}>
                  <div className={styles.flowRowLabel}>
                    <span className={styles.flowDot} style={{ background: '#e0891a' }} />
                    {bq?.in_flight_label ?? 'Pending at bank (net payouts)'}
                  </div>
                  <div className={styles.flowRowNum} style={{ color: '#e0891a' }}>
                    {bq?.in_flight_usd}
                  </div>
                </div>
              ) : null}
              {priorMonthTotal > 0 ? (
                <div className={styles.flowRow}>
                  <div className={styles.flowRowLabel}>
                    <span className={styles.flowDot} style={{ background: '#B45309' }} />
                    Prior month credits on bank statement
                  </div>
                  <div className={styles.flowRowNum} style={{ color: '#B45309' }}>
                    {reconciliation?.prior_month_total_usd}
                    {priorMonthCount > 0 ? (
                      <span className={styles.flowRowHint}>
                        ({priorMonthCount} item{priorMonthCount === 1 ? '' : 's'})
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {refundsAdj > 0 ? (
                <div className={styles.flowRow}>
                  <div className={styles.flowRowLabel}>
                    <span className={styles.flowDot} style={{ background: '#e0891a' }} />
                    Refunds
                  </div>
                  <div className={styles.flowRowNum} style={{ color: '#64748b' }}>
                    {bq?.refunds_usd}
                  </div>
                </div>
              ) : null}
              {otherAdj > 0 ? (
                <div className={styles.flowRow}>
                  <div className={styles.flowRowLabel}>
                    <span className={styles.flowDot} style={{ background: '#94A3B8' }} />
                    {bq?.other_adjustments_label ?? 'Other adjustments'}
                  </div>
                  <div className={styles.flowRowNum} style={{ color: '#64748b' }}>
                    {bq?.other_adjustments_usd}
                  </div>
                </div>
              ) : null}
              {bq?.cash_on_hand_usd ? (
                <div className={styles.flowRow}>
                  <div className={styles.flowRowLabel}>
                    <span className={styles.flowDot} style={{ background: '#B45309' }} />
                    {bq.cash_on_hand_label ?? 'Cash on hand (not a bank deposit)'}
                  </div>
                  <div className={styles.flowRowNum} style={{ color: '#B45309' }}>
                    {bq.cash_on_hand_usd}
                  </div>
                </div>
              ) : null}
              <div className={styles.flowRow}>
                <div className={styles.flowRowLabel}>
                  <span className={styles.flowDot} style={{ background: '#c43c3c' }} />
                  {bq?.flagged_label ?? 'Unmatched items'}
                </div>
                <div className={styles.flowRowNum} style={{ color: '#c43c3c' }}>
                  {bq?.flagged_usd ?? '$0.00'}
                </div>
              </div>
              <div className={styles.flowRow}>
                <div className={styles.flowRowLabel}>
                  <span className={styles.flowDot} style={{ background: '#2f5bd8' }} />
                  {bq?.fees_label ?? 'Processing fees'}
                </div>
                <div className={styles.flowRowNum} style={{ color: '#2f5bd8' }}>
                  {bq?.fees_usd ?? '—'}
                </div>
              </div>
            </div>

            <div className={`${styles.flowSide} ${styles.flowEnd}`}>
              <div className={styles.flowSideLabel}>Bank deposits</div>
              <div className={styles.flowSideNum}>{bq?.bank_deposits_usd ?? '—'}</div>
              <div className={styles.flowSideSub}>{bq?.bank_deposits_subtitle ?? 'Cleared'}</div>
            </div>
          </div>

          {bannerText ? (
            <div className={styles.okBanner}>
              <i className="ti ti-circle-check" aria-hidden />
              <span>{bannerText}</span>
            </div>
          ) : null}
        </section>

        <HealthDonut
          matchedPct={donutMatched}
          pendingPct={donutPending}
          flaggedPct={donutFlagged}
          note={health?.note ?? (health?.section_label ? `Your ${health.section_label} on file.` : null)}
        />
      </div>
    </>
  );
}
