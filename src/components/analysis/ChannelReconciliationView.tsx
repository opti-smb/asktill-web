import {
  fmtMoney,
  getAnalyzeAnalysis,
  getReportTotals,
  reportReconciliationTotals,
  type AnalyzeResult,
} from '../../lib/analyzeResponse';
import styles from './ChannelReconciliationView.module.css';

function roleIcon(title: string) {
  const t = title.toLowerCase();
  if (t.includes('e-comm') || t.includes('ecomm') || t.includes('online')) {
    return <i className="ti ti-shopping-cart" aria-hidden />;
  }
  if (t.includes('bank')) {
    return <i className="ti ti-building-bank" aria-hidden />;
  }
  return <i className="ti ti-shopping-bag" aria-hidden />;
}

function roleTone(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('e-comm') || t.includes('ecomm') || t.includes('online')) return styles.toneBlue;
  if (t.includes('bank')) return styles.toneGreen;
  return styles.toneOrange;
}

/** Month report: channel revenue, processors, bank match, and notes (single view). */
export default function ChannelReconciliationView({
  result,
}: {
  result: AnalyzeResult | null | undefined;
}) {
  const report = getReportTotals(result);
  if (!report) return null;

  const analysis = getAnalyzeAnalysis(result);
  const breakdown = analysis?.channel_breakdown;
  const processors = analysis?.processors ?? [];
  const periodLabel = analysis?.period_label;
  const recon = reportReconciliationTotals(result);
  const businessName = analysis?.business_name?.trim();
  const reportHeading =
    report.title?.trim() ||
    (businessName && periodLabel
      ? `${businessName} — ${periodLabel}`
      : businessName || 'Business details');

  const hasChannels = report.channels.length > 0;
  const hasBank =
    recon.expectedInflows != null ||
    recon.actualBankCredits != null ||
    recon.gap != null ||
    recon.matchedDeposits != null ||
    breakdown != null;
  const hasNotes = (report.notes?.length ?? 0) > 0;
  const gapZero = recon.gap != null && Math.abs(recon.gap) < 0.005;
  const showBankAside = hasBank && (hasChannels || processors.length > 0);
  const notesOnly = hasNotes && !hasChannels && processors.length === 0 && !showBankAside;
  const showTitle = Boolean(reportHeading && !notesOnly);

  return (
    <section className={styles.card}>
      {showTitle ? (
        <div className={styles.head}>
          <h2 className={styles.title}>{reportHeading}</h2>
        </div>
      ) : null}

      <div className={showBankAside ? styles.body : styles.bodyFull}>
        <div className={styles.mainCol}>
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
                        <td>
                          <span className={styles.channelCell}>
                            <span
                              className={`${styles.channelIcon} ${roleTone(ch.label)}`}
                              aria-hidden
                            >
                              {roleIcon(ch.label)}
                            </span>
                            {ch.label}
                          </span>
                        </td>
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
                    <span
                      className={`${styles.processorIcon} ${roleTone(p.title)}`}
                      aria-hidden
                    >
                      {roleIcon(p.title)}
                    </span>
                    <div className={styles.processorCopy}>
                      <strong>{p.title}</strong>
                      <span className={styles.processorMeta}>
                        {p.gross_processed != null && (
                          <span>Gross {fmtMoney(p.gross_processed)}</span>
                        )}
                        {p.fees != null && <span>Fees {fmtMoney(p.fees)}</span>}
                        {p.net_to_bank != null && (
                          <span>Net to bank {fmtMoney(p.net_to_bank)}</span>
                        )}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {showBankAside ? (
          <aside className={styles.bankCard}>
            <h3 className={styles.bankTitle}>Bank reconciliation</h3>
            <dl className={styles.bankDl}>
              {recon.matchedDeposits != null ? (
                <div className={styles.bankRow}>
                  <dt>Matched deposits</dt>
                  <dd>{fmtMoney(recon.matchedDeposits)}</dd>
                </div>
              ) : null}
              <div className={styles.bankRow}>
                <dt>Expected processor inflows</dt>
                <dd>{fmtMoney(recon.expectedInflows)}</dd>
              </div>
              <div className={styles.bankRow}>
                <dt>Bank credits</dt>
                <dd>{fmtMoney(recon.actualBankCredits)}</dd>
              </div>
              <div className={`${styles.bankRow} ${styles.gapRow}`}>
                <dt>Reconciliation gap</dt>
                <dd className={gapZero ? styles.gapOk : undefined}>{fmtMoney(recon.gap)}</dd>
              </div>
            </dl>
          </aside>
        ) : null}
      </div>

      {hasNotes ? (
        <div className={notesOnly ? styles.notesOnly : styles.notesBlock}>
          <h3 className={styles.blockTitle}>Notes</h3>
          <ul className={styles.notesList}>
            {report.notes!.map((n, i) => (
              <li key={i}>{typeof n === 'string' ? n : JSON.stringify(n)}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
