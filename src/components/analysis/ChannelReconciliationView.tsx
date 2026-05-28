import { fmtMoney, getAnalyzeAnalysis, getReportTotals, type AnalyzeResult } from '../../lib/analyzeResponse';
import styles from './PostmanPanels.module.css';

/** Month report: channel revenue, processors, bank match, and notes (single view). */
export default function ChannelReconciliationView({
  result,
}: {
  result: AnalyzeResult | null | undefined;
}) {
  const report = getReportTotals(result);
  const analysis = getAnalyzeAnalysis(result);
  const breakdown = analysis?.channel_breakdown;
  const processors = analysis?.processors ?? [];
  const periodLabel = analysis?.period_label;

  if (!report) return null;

  const hasChannels = report.channels.length > 0;
  const hasBank =
    breakdown != null ||
    report.expected_bank_inflows != null ||
    report.actual_bank_credits != null ||
    report.difference != null;
  const hasNotes = (report.notes?.length ?? 0) > 0;

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <h2 className={styles.title}>{report.title ?? 'Reconciliation report'}</h2>
        {periodLabel ? <p className={styles.sub}>{periodLabel}</p> : null}
      </div>

      {hasChannels && (
        <div className={styles.block}>
          <h3 className={styles.blockTitle}>Revenue by channel</h3>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Channel</th>
                  <th>Gross sales</th>
                  <th>Refunds</th>
                  <th>Net revenue</th>
                  <th>Fees</th>
                  <th>Net to bank</th>
                </tr>
              </thead>
              <tbody>
                {report.channels.map((ch) => (
                  <tr key={`${ch.label}-${ch.source_file}`}>
                    <td>{ch.label}</td>
                    <td>{fmtMoney(ch.gross_sales)}</td>
                    <td>{fmtMoney(ch.refunds)}</td>
                    <td>{fmtMoney(ch.net_sales)}</td>
                    <td>{fmtMoney(ch.fees)}</td>
                    <td>{fmtMoney(ch.net_to_bank)}</td>
                  </tr>
                ))}
                <tr className={styles.totalRow}>
                  <td>
                    <strong>Total</strong>
                  </td>
                  <td>
                    <strong>{fmtMoney(report.total_gross)}</strong>
                  </td>
                  <td>
                    <strong>{fmtMoney(report.total_refunds)}</strong>
                  </td>
                  <td>
                    <strong>{fmtMoney(report.total_net_sales)}</strong>
                  </td>
                  <td>
                    <strong>{fmtMoney(report.total_fees)}</strong>
                  </td>
                  <td>
                    <strong>{fmtMoney(report.total_net_to_bank)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {processors.length > 0 && (
        <div className={styles.block}>
          <h3 className={styles.blockTitle}>Processors</h3>
          <ul className={styles.processorList}>
            {processors.map((p) => (
              <li key={p.id ?? p.title}>
                <strong>{p.title}</strong>
                {p.gross_processed != null && <span> · Gross {fmtMoney(p.gross_processed)}</span>}
                {p.fees != null && <span> · Fees {fmtMoney(p.fees)}</span>}
                {p.net_to_bank != null && <span> · Net to bank {fmtMoney(p.net_to_bank)}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasBank && (
        <div className={styles.block}>
          <h3 className={styles.blockTitle}>Bank reconciliation</h3>
          <dl className={styles.dl}>
            <dt>Expected inflows</dt>
            <dd>
              {breakdown?.total_expected_payouts_usd ??
                fmtMoney(breakdown?.total_expected_payouts ?? report.expected_bank_inflows)}
            </dd>
            <dt>Bank credits</dt>
            <dd>
              {breakdown?.total_bank_credits_usd ??
                fmtMoney(breakdown?.total_bank_credits ?? report.actual_bank_credits)}
            </dd>
            <dt>Difference</dt>
            <dd>
              {breakdown?.overall_difference_usd ??
                fmtMoney(breakdown?.overall_difference ?? report.difference)}
            </dd>
          </dl>
        </div>
      )}

      {hasNotes && (
        <div className={styles.block}>
          <h3 className={styles.blockTitle}>Notes</h3>
          <ul className={styles.notesList}>
            {report.notes!.map((n, i) => (
              <li key={i}>{typeof n === 'string' ? n : JSON.stringify(n)}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
