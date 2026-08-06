import { useEffect, useMemo, useState } from 'react';
import type { AnalyzeResult, CashFlowUiApi } from '../../lib/analyzeResponse';
import { fmtMoney, reportMatchedDeposits } from '../../lib/analyzeResponse';
import {
  inflows as mockInflows,
  outflows as mockOutflows,
} from '../../data/cashflow';
import styles from './InflowOutflow.module.css';

interface InflowOutflowProps {
  cashFlow?: CashFlowUiApi | null;
  result?: AnalyzeResult | null;
  hasLiveAnalysis?: boolean;
}

function pctFromWidth(width: string | undefined): string {
  if (!width) return '';
  const m = String(width).match(/([\d.]+)\s*%/);
  return m ? `${Number(m[1]).toFixed(1)}%` : width;
}

export default function InflowOutflow({ cashFlow, result }: InflowOutflowProps) {
  const hasLiveData = Boolean(cashFlow);
  const useSample = false;
  const matchedDeposits = reportMatchedDeposits(result);
  const inflows = cashFlow?.inflows?.length
    ? cashFlow.inflows.map((row) => ({
        label: row.label,
        width: row.width,
        color: row.color || '#0f8a57',
        value: row.value_usd,
        pct: pctFromWidth(row.width),
      }))
    : useSample
      ? mockInflows.map((row) => ({ ...row, pct: pctFromWidth(row.width) }))
      : [];

  const outflows = cashFlow?.outflows?.length
    ? cashFlow.outflows.map((row) => ({
        label: row.label,
        width: row.width,
        color: row.color || '#c43c3c',
        value: row.value_usd,
        pct: pctFromWidth(row.width),
      }))
    : useSample
      ? mockOutflows.map((row) => ({ ...row, pct: pctFromWidth(row.width) }))
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
  const moneyOutNote = cashFlow?.money_out_note;
  const moneyInNote = cashFlow?.money_in_note;
  const debitsReconciled = cashFlow?.debits_reconciled;
  const bankBasedFlow = Boolean(
    cashFlow?.money_in_subtitle?.includes('credits on bank statement') ||
      cashFlow?.money_out_subtitle?.includes('debits on bank statement'),
  );

  const inTotalPct =
    inflows.length > 0 ? '100%' : '';
  const outTotalPct = outflows.length > 0 ? '100%' : '';

  return (
    <>
      <div className={styles.grid2}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Expected Inflows</div>
          <div className={`${styles.cardBig} ${styles.inAmount}`}>{moneyIn}</div>

          <div className={styles.breakdown}>
            {inflows.map((item) => (
              <div key={item.label} className={styles.breakdownRow}>
                <div className={styles.breakdownLeft}>
                  <span className={styles.dot} style={{ background: item.color }} />
                  <span className={styles.breakdownLabel}>{item.label}</span>
                </div>
                <div className={styles.breakdownTrack}>
                  <div
                    className={styles.breakdownFill}
                    style={{ width: item.width, background: item.color }}
                  />
                </div>
                <div className={styles.breakdownRight}>
                  <span className={styles.breakdownValue}>{item.value}</span>
                  {item.pct ? <span className={styles.breakdownPct}>{item.pct}</span> : null}
                </div>
              </div>
            ))}
            {inflows.length > 0 ? (
              <div className={`${styles.breakdownRow} ${styles.totalRow}`}>
                <div className={styles.breakdownLeft}>
                  <span className={styles.breakdownLabel}>
                    <strong>Total</strong>
                  </span>
                </div>
                <div className={styles.breakdownTrack} />
                <div className={styles.breakdownRight}>
                  <span className={styles.breakdownValue}>
                    <strong>{moneyIn}</strong>
                  </span>
                  <span className={styles.breakdownPct}>{inTotalPct}</span>
                </div>
              </div>
            ) : hasLiveData ? (
              <p className={styles.emptyRows}>No inflow breakdown for this period.</p>
            ) : null}
          </div>
          {moneyInNote && hasLiveData ? <div className={styles.reconNote}>{moneyInNote}</div> : null}
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Expected Outflows</div>
          <div className={`${styles.cardBig} ${styles.outAmount}`}>{moneyOut}</div>

          {moneyOutNote && bankBasedFlow ? (
            <div className={debitsReconciled === false ? styles.reconNoteWarn : styles.reconNote}>
              {moneyOutNote}
            </div>
          ) : null}

          <div className={styles.breakdown}>
            {outflows.map((item) => (
              <div key={item.label} className={styles.breakdownRow}>
                <div className={styles.breakdownLeft}>
                  <span className={styles.dot} style={{ background: item.color }} />
                  <span className={styles.breakdownLabel}>{item.label}</span>
                </div>
                <div className={styles.breakdownTrack}>
                  <div
                    className={styles.breakdownFill}
                    style={{ width: item.width, background: item.color }}
                  />
                </div>
                <div className={styles.breakdownRight}>
                  <span className={styles.breakdownValue}>{item.value}</span>
                  {item.pct ? <span className={styles.breakdownPct}>{item.pct}</span> : null}
                </div>
              </div>
            ))}
            {outflows.length > 0 ? (
              <div className={`${styles.breakdownRow} ${styles.totalRow}`}>
                <div className={styles.breakdownLeft}>
                  <span className={styles.breakdownLabel}>
                    <strong>Total</strong>
                  </span>
                </div>
                <div className={styles.breakdownTrack} />
                <div className={styles.breakdownRight}>
                  <span className={styles.breakdownValue}>
                    <strong>{moneyOut}</strong>
                  </span>
                  <span className={styles.breakdownPct}>{outTotalPct}</span>
                </div>
              </div>
            ) : hasLiveData ? (
              <p className={styles.emptyRows}>No outflow breakdown for this period.</p>
            ) : null}
          </div>

          {bankDebitLines.length > 0 ? (
            <div className={styles.debitTableWrap}>
              <div className={styles.debitTableHeader}>
                <div>
                  <div className={styles.debitTableTitle}>Bank debits this period</div>
                  <div className={styles.debitTableSummary}>
                    {bankDebitLines.length} line{bankDebitLines.length === 1 ? '' : 's'} from your
                    statement
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
                </button>
              </div>
              {debitDetailsOpen ? (
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
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
