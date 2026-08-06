import {
  fmtMoney,
  reportReconciliationTotals,
  type AnalyzeResult,
} from '../../lib/analyzeResponse';
import styles from './ReportsTotalsBand.module.css';

type Props = {
  result: AnalyzeResult | null | undefined;
  periodLabel?: string | null;
};

const ROWS: Array<{
  key: keyof ReturnType<typeof reportReconciliationTotals>;
  label: string;
  icon: string;
  tone: 'green' | 'orange' | 'blue' | 'gray';
}> = [
  {
    key: 'matchedDeposits',
    label: 'Matched deposits (POS + e-commerce)',
    icon: 'ti-circle-check',
    tone: 'green',
  },
  {
    key: 'posDeposited',
    label: 'POS deposited to bank',
    icon: 'ti-shopping-bag',
    tone: 'orange',
  },
  {
    key: 'ecomDeposited',
    label: 'E-commerce deposited to bank',
    icon: 'ti-shopping-cart',
    tone: 'blue',
  },
  {
    key: 'expectedInflows',
    label: 'Expected processor inflows',
    icon: 'ti-file-text',
    tone: 'gray',
  },
  {
    key: 'actualBankCredits',
    label: 'Bank credits',
    icon: 'ti-file-text',
    tone: 'gray',
  },
];

/** Presentational totals + summary cards for the Reports tab (existing recon data only). */
export default function ReportsTotalsBand({ result, periodLabel }: Props) {
  const recon = reportReconciliationTotals(result);
  const hasAny = ROWS.some((r) => recon[r.key] != null) || recon.gap != null;
  if (!hasAny) return null;

  const gap = recon.gap;
  const gapZero = gap != null && Math.abs(gap) < 0.005;
  const title = periodLabel
    ? `Reconciliation totals — ${periodLabel}`
    : 'Reconciliation totals';

  return (
    <div className={styles.band}>
      <section className={styles.totalsCard}>
        <div className={styles.totalsHead}>
          <h2 className={styles.totalsTitle}>{title}</h2>
          <p className={styles.totalsSub}>All amounts are for the current analysis period.</p>
        </div>
        <ul className={styles.rows}>
          {ROWS.map((row) => {
            const value = recon[row.key];
            if (value == null) return null;
            return (
              <li key={row.key} className={styles.row}>
                <span className={styles.rowLeft}>
                  <span className={`${styles.rowIcon} ${styles[`tone_${row.tone}`]}`} aria-hidden>
                    <i className={`ti ${row.icon}`} />
                  </span>
                  <span className={styles.rowLabel}>{row.label}</span>
                </span>
                <span className={styles.rowValue}>{fmtMoney(value)}</span>
              </li>
            );
          })}
          {gap != null ? (
            <li className={`${styles.row} ${styles.gapRow}`}>
              <span className={styles.rowLeft}>
                <span className={`${styles.rowIcon} ${styles.tone_green}`} aria-hidden>
                  <i className="ti ti-scale" />
                </span>
                <span className={styles.gapLabel}>Reconciliation gap</span>
              </span>
              <span className={`${styles.rowValue} ${gapZero ? styles.gapOk : styles.gapWarn}`}>
                {fmtMoney(gap)}
              </span>
            </li>
          ) : null}
        </ul>
      </section>

      <section className={styles.summaryCard}>
        <h2 className={styles.summaryTitle}>Summary</h2>
        <div className={styles.summaryBody}>
          <span
            className={`${styles.summaryMark} ${gapZero ? styles.summaryOk : styles.summaryWarn}`}
            aria-hidden
          >
            <i className={gapZero ? 'ti ti-check' : 'ti ti-alert-triangle'} />
          </span>
          {gapZero ? (
            <p className={styles.summaryCopy}>
              All deposits accounted for. No reconciliation adjustments needed.
            </p>
          ) : (
            <p className={styles.summaryCopy}>
              Gap needs review. Processor inflows and bank credits differ by {fmtMoney(gap)}. Check
              deposits and timing below.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
