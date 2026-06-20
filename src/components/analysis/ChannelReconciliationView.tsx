import {
  fmtMoney,
  getAnalyzeAnalysis,
  getReportTotals,
  reportReconciliationTotals,
  type AnalyzeResult,
} from '../../lib/analyzeResponse';
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
  const recon = reportReconciliationTotals(result);

  if (!report) return null;

  const hasChannels = report.channels.length > 0;
  const hasBank =
    recon.expectedInflows != null ||
    recon.actualBankCredits != null ||
    recon.gap != null ||
    recon.matchedDeposits != null ||
    breakdown != null;
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
            {recon.matchedDeposits != null ? (
              <>
                <dt>Matched deposits (POS + e-commerce)</dt>
                <dd>{fmtMoney(recon.matchedDeposits)}</dd>
                {recon.posDeposited != null ? (
                  <>
                    <dt>POS deposited to bank</dt>
                    <dd>{fmtMoney(recon.posDeposited)}</dd>
                  </>
                ) : null}
                {recon.ecomDeposited != null ? (
                  <>
                    <dt>E-commerce deposited to bank</dt>
                    <dd>{fmtMoney(recon.ecomDeposited)}</dd>
                  </>
                ) : null}
              </>
            ) : null}
            <dt>Expected processor inflows</dt>
            <dd>{fmtMoney(recon.expectedInflows)}</dd>
            <dt>Bank credits</dt>
            <dd>{fmtMoney(recon.actualBankCredits)}</dd>
            <dt>Reconciliation gap</dt>
            <dd>{fmtMoney(recon.gap)}</dd>
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
