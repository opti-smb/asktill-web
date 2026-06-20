import { useEffect, useMemo, useState } from 'react';
import type { AnalyzeResult, CashFlowUiApi } from '../../lib/analyzeResponse';
import { fmtMoney, reportMatchedDeposits } from '../../lib/analyzeResponse';
import {
  inflows as mockInflows,
  outflows as mockOutflows,
  inflowMonthBars,
  outflowMonthBars,
} from '../../data/cashflow';
import MonthTrendChart from './MonthTrendChart';
import styles from './InflowOutflow.module.css';

interface InflowOutflowProps {
  cashFlow?: CashFlowUiApi | null;
  result?: AnalyzeResult | null;
  hasLiveAnalysis?: boolean;
}

function deltaPillClass(deltaType?: string | null): string {
  if (deltaType === 'down') return styles.down;
  if (deltaType === 'flat') return styles.up;
  return styles.up;
}

function renderGuidanceAnswer(text: string) {
  const parts = text.split(/(\$[\d,]+(?:\.\d{2})?)/g);
  return parts.map((part, i) =>
    part.startsWith('$') ? (
      <strong key={i} className={styles.num}>
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function MockMonthBars({
  bars,
  avgY,
  avgValue,
}: {
  bars: typeof inflowMonthBars;
  avgY: number;
  avgValue: string;
}) {
  const chartBars = bars.map((bar) => ({
    label: bar.label,
    value_usd: bar.value,
    amount: 0,
    x: bar.x,
    y: bar.y,
    width: 60,
    height: bar.height,
    rx: bar.rx,
    fill: bar.fill,
    text_fill: bar.textFill,
  }));
  return (
    <MonthTrendChart
      trend={{
        section_label: 'Last 3 months',
        bars: chartBars,
        avg_usd: avgValue,
        avg_label: '3-mo avg',
        show_avg_line: true,
      }}
      avgLineY={avgY}
    />
  );
}

export default function InflowOutflow({ cashFlow, result }: InflowOutflowProps) {
  const hasLiveData = Boolean(cashFlow);
  const useSample = false;
  const matchedDeposits = reportMatchedDeposits(result);
  const inflows = cashFlow?.inflows?.length
    ? cashFlow.inflows.map((row) => ({
        label: row.label,
        width: row.width,
        color: row.color,
        value: row.value_usd,
      }))
    : useSample
      ? mockInflows
      : [];

  const outflows = cashFlow?.outflows?.length
    ? cashFlow.outflows.map((row) => ({
        label: row.label,
        width: row.width,
        color: row.color,
        value: row.value_usd,
      }))
    : useSample
      ? mockOutflows
      : [];

  const bankDebitLines = cashFlow?.bank_debit_lines ?? [];
  const [debitDetailsOpen, setDebitDetailsOpen] = useState(false);
  const debitLinesKey = useMemo(
    () => bankDebitLines.map((line) => `${line.date}|${line.description}|${line.amount_usd}`).join(';'),
    [bankDebitLines],
  );

  useEffect(() => {
    setDebitDetailsOpen(false);
  }, [debitLinesKey]);

  const moneyIn =
    matchedDeposits != null
      ? fmtMoney(matchedDeposits)
      : cashFlow?.money_in_usd ?? (useSample ? '$58,234' : '—');
  const moneyOut = cashFlow?.money_out_usd ?? (useSample ? '$47,521' : '—');
  const inSubtitle =
    matchedDeposits != null
      ? 'POS + e-commerce matched to bank (same as compact report)'
      : cashFlow?.money_in_subtitle ?? (useSample ? 'March · vs Feb · 3-mo avg' : 'Upload and analyze to see inflows');
  const outSubtitle = cashFlow?.money_out_subtitle ?? (useSample ? 'March · vs Feb · 3-mo avg' : 'Upload and analyze to see outflows');
  const inTrend = cashFlow?.money_in_trend;
  const outTrend = cashFlow?.money_out_trend;

  const guidance = cashFlow?.guidance;
  const moneyOutNote = cashFlow?.money_out_note;
  const moneyInNote = cashFlow?.money_in_note;
  const debitsReconciled = cashFlow?.debits_reconciled;
  const bankBasedFlow = Boolean(
    guidance ||
      cashFlow?.money_in_subtitle?.includes('credits on bank statement') ||
      cashFlow?.money_out_subtitle?.includes('debits on bank statement'),
  );

  return (
    <>
      <div className={`${styles.askBanner} ${guidance?.severity === 'warn' ? styles.askBannerWarn : ''}`}>
        <div className={styles.askBannerIcon}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </div>
        <div className={styles.askBannerContent}>
          <div className={styles.askBannerQ}>
            &quot;{guidance?.question ?? 'Can I afford to hire a new server next month?'}&quot;
          </div>
          {guidance ? (
            <>
              <div className={styles.askBannerHeadline}>{guidance.headline}</div>
              <div className={styles.askBannerA}>{renderGuidanceAnswer(guidance.answer)}</div>
            </>
          ) : (
            <div className={styles.askBannerA}>
              {hasLiveData ? (
                <>
                  Upload a bank statement to see where money came in and went out, then compare cash on hand to the
                  wage you&apos;re considering.
                </>
              ) : (
                <>
                  <strong>Example only.</strong> At{' '}
                  <span className={styles.num}>$18/hr × 30hrs/week</span>, you&apos;d add ~$2,340/mo in payroll — upload
                  statements to see your real numbers.
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={styles.grid2}>
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
              <div className={styles.cardSubtitle}>{inSubtitle}</div>
            </div>
          </div>
          <div className={styles.cardBig}>{moneyIn}</div>
          <div className={styles.cardMeta}>
            {hasLiveData && inTrend?.prior_delta ? (
              <>
                <span className={`${styles.pill} ${deltaPillClass(inTrend.prior_delta_type)}`}>{inTrend.prior_delta}</span>
                {inTrend.avg_usd && (
                  <span className={styles.cardMetaText}>
                    {inTrend.avg_label ?? 'Avg'}: {inTrend.avg_usd}
                  </span>
                )}
              </>
            ) : hasLiveData ? (
              <span className={styles.cardMetaText}>{bankBasedFlow ? 'Bank credits' : 'Revenue by channel'}</span>
            ) : useSample ? (
              <>
                <span className={`${styles.pill} ${styles.up}`}>▲ 12.4% vs Feb</span>
                <span className={styles.cardMetaText}>3-mo avg: $52,840</span>
              </>
            ) : null}
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
          {moneyInNote && hasLiveData && (
            <div className={styles.reconNote}>{moneyInNote}</div>
          )}
          {hasLiveData ? (
            <MonthTrendChart trend={inTrend} />
          ) : useSample ? (
            <MockMonthBars bars={inflowMonthBars} avgY={32} avgValue="$52,858" />
          ) : null}
        </div>

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
              <div className={styles.cardSubtitle}>{outSubtitle}</div>
            </div>
          </div>
          <div className={styles.cardBig}>{moneyOut}</div>
          <div className={styles.cardMeta}>
            {hasLiveData && outTrend?.prior_delta ? (
              <>
                <span className={`${styles.pill} ${deltaPillClass(outTrend.prior_delta_type)}`}>{outTrend.prior_delta}</span>
                {outTrend.avg_usd && (
                  <span className={styles.cardMetaText}>
                    {outTrend.avg_label ?? 'Avg'}: {outTrend.avg_usd}
                  </span>
                )}
              </>
            ) : hasLiveData ? (
              <span className={styles.cardMetaText}>
                {bankBasedFlow ? 'Bank debits' : 'Fees and charges'}
                {debitsReconciled === true && bankBasedFlow ? ' · verified against statement' : ''}
              </span>
            ) : useSample ? (
              <>
                <span className={`${styles.pill} ${styles.down}`}>▲ 15.2% vs Feb</span>
                <span className={styles.cardMetaText}>3-mo avg: $42,180</span>
              </>
            ) : null}
          </div>
          {moneyOutNote && bankBasedFlow && (
            <div className={debitsReconciled === false ? styles.reconNoteWarn : styles.reconNote}>
              {moneyOutNote}
            </div>
          )}
          <div className={styles.breakdown}>
            {outflows.map((item) => (
              <div key={item.label} className={styles.breakdownRow}>
                <div className={styles.breakdownLabel}>{item.label}</div>
                <div className={styles.breakdownTrack}>
                  <div
                    className={styles.breakdownFill}
                    style={{ width: item.width, background: item.color }}
                  />
                </div>
                <div className={styles.breakdownValue}>{item.value}</div>
              </div>
            ))}
          </div>
          {bankDebitLines.length > 0 && (
            <div className={styles.debitTableWrap}>
              <div className={styles.debitTableHeader}>
                <div>
                  <div className={styles.debitTableTitle}>Bank debits this period</div>
                  <div className={styles.debitTableSummary}>
                    {bankDebitLines.length} line{bankDebitLines.length === 1 ? '' : 's'} from your statement
                    {moneyOut ? ` · total ${moneyOut}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.debitDetailsToggle}
                  onClick={() => setDebitDetailsOpen((open) => !open)}
                  aria-expanded={debitDetailsOpen}
                >
                  {debitDetailsOpen ? 'Hide details' : 'View more details'}
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={debitDetailsOpen ? styles.debitChevronOpen : styles.debitChevron}
                    aria-hidden
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </div>
              {debitDetailsOpen && (
                <div className={styles.debitTableScroll}>
                  <table className={styles.debitTable}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Category</th>
                        <th className={styles.debitAmt}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bankDebitLines.map((line, index) => (
                        <tr key={`${line.date}-${line.description}-${index}`}>
                          <td>{line.date}</td>
                          <td>{line.description}</td>
                          <td>{line.category}</td>
                          <td className={styles.debitAmt}>{line.amount_usd}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {hasLiveData ? (
            <MonthTrendChart trend={outTrend} />
          ) : useSample ? (
            <MockMonthBars bars={outflowMonthBars} avgY={36} avgValue="$42,500" />
          ) : null}
        </div>
      </div>
    </>
  );
}
