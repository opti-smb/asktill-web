import { useEffect, useMemo, useState } from 'react';
import {
  fmtMoney,
  type WeekChannelSummaryApi,
  type WeekReportSliceApi,
  type WeekReportsViewApi,
} from '../../lib/analyzeResponse';
import styles from './PostmanPanels.module.css';
import weekStyles from './WeekReportPanel.module.css';

/** Show $0.00 instead of em dash so POS / e-com rows read clearly. */
function fmtMoneyZero(v: unknown): string {
  if (v == null || (typeof v === 'number' && Number.isNaN(v))) {
    return fmtMoney(0);
  }
  return fmtMoney(v);
}

function num(v: unknown): number {
  return typeof v === 'number' && !Number.isNaN(v) ? v : 0;
}

function weekProcessorTotals(week: WeekReportSliceApi) {
  const pos = week.pos;
  const ecom = week.ecommerce;

  const posGross = num(pos?.gross_sales);
  const ecomGross = num(ecom?.gross_sales);
  const posRefunds = num(pos?.refunds);
  const ecomRefunds = num(ecom?.refunds);
  const posNet = num(pos?.net_sales ?? pos?.gross_sales);
  const ecomNet = num(ecom?.net_sales ?? ecom?.gross_sales);
  const posFees = num(pos?.fees);
  const ecomFees = num(ecom?.fees);
  const posNetBank = num(pos?.net_to_bank);
  const ecomNetBank = num(ecom?.net_to_bank);

  return {
    gross: posGross + ecomGross,
    refunds: posRefunds + ecomRefunds,
    netSales: posNet + ecomNet,
    fees: posFees + ecomFees,
    netToBank: posNetBank + ecomNetBank,
    posNetBank,
    ecomNetBank,
  };
}

function ProcessorTable({ week }: { week: WeekReportSliceApi }) {
  const totals = weekProcessorTotals(week);

  const rows: Array<{
    key: string;
    label: string;
    channel: WeekChannelSummaryApi | null | undefined;
  }> = [
    { key: 'pos', label: 'POS (in-store)', channel: week.pos },
    { key: 'ecom', label: 'E-commerce', channel: week.ecommerce },
  ];

  return (
    <>
      <div className={weekStyles.summaryGrid}>
        <div className={weekStyles.summaryCard}>
          <span className={weekStyles.summaryLabel}>POS · net to bank</span>
          <strong className={weekStyles.summaryValue}>{fmtMoneyZero(totals.posNetBank)}</strong>
        </div>
        <div className={weekStyles.summaryCard}>
          <span className={weekStyles.summaryLabel}>E-commerce · net to bank</span>
          <strong className={weekStyles.summaryValue}>{fmtMoneyZero(totals.ecomNetBank)}</strong>
        </div>
        <div className={`${weekStyles.summaryCard} ${weekStyles.summaryCardHighlight}`}>
          <span className={weekStyles.summaryLabel}>Expected payouts (POS + e-com)</span>
          <strong className={weekStyles.summaryValue}>{fmtMoneyZero(totals.netToBank)}</strong>
        </div>
      </div>

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
            {rows.map(({ key, label, channel }) => (
              <tr key={key}>
                <td>
                  <div>{label}</div>
                  {channel?.activity_count ? (
                    <div className={weekStyles.activity}>
                      {channel.activity_count} {channel.activity_label}
                    </div>
                  ) : null}
                </td>
                <td>{fmtMoneyZero(channel?.gross_sales)}</td>
                <td>{fmtMoneyZero(channel?.refunds)}</td>
                <td>{fmtMoneyZero(channel?.net_sales ?? channel?.gross_sales)}</td>
                <td>{fmtMoneyZero(channel?.fees)}</td>
                <td>{fmtMoneyZero(channel?.net_to_bank)}</td>
              </tr>
            ))}
            <tr className={styles.totalRow}>
              <td>
                <strong>Week total</strong>
              </td>
              <td>
                <strong>{fmtMoneyZero(totals.gross)}</strong>
              </td>
              <td>
                <strong>{fmtMoneyZero(totals.refunds)}</strong>
              </td>
              <td>
                <strong>{fmtMoneyZero(totals.netSales)}</strong>
              </td>
              <td>
                <strong>{fmtMoneyZero(totals.fees)}</strong>
              </td>
              <td>
                <strong>{fmtMoneyZero(totals.netToBank)}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function WeekReportPanel({
  weekReports,
  loading = false,
  error = null,
}: {
  weekReports: WeekReportsViewApi | null | undefined;
  loading?: boolean;
  error?: string | null;
}) {
  const weeks = weekReports?.weeks ?? [];
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!weeks.length) {
      setSelectedKey(null);
      return;
    }
    const fallback = weekReports?.default_week_key ?? weeks[weeks.length - 1]?.week_key ?? null;
    setSelectedKey((current) =>
      current && weeks.some((week) => week.week_key === current) ? current : fallback,
    );
  }, [weekReports?.default_week_key, weeks]);

  const selectedWeek = useMemo(
    () => weeks.find((week) => week.week_key === selectedKey) ?? weeks[weeks.length - 1],
    [weeks, selectedKey],
  );

  if (loading) {
    return (
      <section className={styles.panel}>
        <div className={styles.head}>
          <h2 className={styles.title}>Weekly report</h2>
          <p className={styles.sub}>Loading weekly breakdown from your statements…</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.panel}>
        <div className={styles.head}>
          <h2 className={styles.title}>Weekly report</h2>
          <p className={styles.sub}>{error}</p>
        </div>
      </section>
    );
  }

  if (weekReports == null) {
    return (
      <section className={styles.panel}>
        <div className={styles.head}>
          <h2 className={styles.title}>Weekly report</h2>
          <p className={styles.sub}>
            Upload bank, POS, and e-commerce files, then run Analyze to see weekly breakdowns here.
          </p>
        </div>
      </section>
    );
  }

  if (weeks.length === 0) {
    return (
      <section className={styles.panel}>
        <div className={styles.head}>
          <h2 className={styles.title}>Weekly report</h2>
          <p className={styles.sub}>
            {weekReports.period_label
              ? `No dated POS, e-commerce, or bank rows were found for ${weekReports.period_label}. Check that your files include row dates.`
              : 'No dated POS, e-commerce, or bank rows were found in your uploads. Check that your files include row dates.'}
          </p>
        </div>
      </section>
    );
  }

  const bankCredits = selectedWeek?.bank_credits ?? selectedWeek?.bank?.net_to_bank ?? null;
  const expectedPayouts = weekProcessorTotals(selectedWeek!).netToBank;
  const difference =
    selectedWeek?.difference ??
    (bankCredits != null ? num(bankCredits) - expectedPayouts : null);

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <h2 className={styles.title}>Weekly report</h2>
        <p className={styles.sub}>
          {weekReports.period_label
            ? `${weekReports.period_label} · POS and e-commerce by week, then bank credits compared to expected payouts`
            : 'POS and e-commerce by week, then bank credits compared to expected payouts'}
        </p>
      </div>

      <div className={weekStyles.weekPicker}>
        {weeks.map((week) => (
          <button
            key={week.week_key}
            type="button"
            className={`${weekStyles.weekBtn} ${selectedWeek?.week_key === week.week_key ? weekStyles.weekBtnActive : ''}`}
            onClick={() => setSelectedKey(week.week_key)}
          >
            <span className={weekStyles.weekTitle}>{week.week_title ?? `Week ${week.week_number}`}</span>
            <span className={weekStyles.weekDates}>{week.week_label}</span>
          </button>
        ))}
      </div>

      {selectedWeek && (
        <>
          <div className={styles.block}>
            <h3 className={styles.blockTitle}>
              Revenue by channel · {selectedWeek.week_title ?? selectedWeek.week_label}
            </h3>
            <ProcessorTable week={selectedWeek} />
          </div>

          <div className={styles.block}>
            <h3 className={styles.blockTitle}>Bank reconciliation (this week)</h3>
            <dl className={styles.dl}>
              <dt>POS net to bank</dt>
              <dd>{fmtMoneyZero(weekProcessorTotals(selectedWeek).posNetBank)}</dd>
              <dt>E-commerce net to bank</dt>
              <dd>{fmtMoneyZero(weekProcessorTotals(selectedWeek).ecomNetBank)}</dd>
              <dt>Expected processor payouts (POS + e-com)</dt>
              <dd>{fmtMoneyZero(expectedPayouts)}</dd>
              <dt>Bank credits this week</dt>
              <dd>{fmtMoneyZero(bankCredits)}</dd>
              {selectedWeek.bank?.activity_count ? (
                <>
                  <dt>Bank deposit lines</dt>
                  <dd>
                    {selectedWeek.bank.activity_count} {selectedWeek.bank.activity_label}
                  </dd>
                </>
              ) : null}
              <dt>Difference (bank − expected)</dt>
              <dd>{fmtMoneyZero(difference)}</dd>
            </dl>
          </div>

          {selectedWeek.notes && selectedWeek.notes.length > 0 && (
            <div className={styles.block}>
              <h3 className={styles.blockTitle}>Notes</h3>
              <ul className={styles.notesList}>
                {selectedWeek.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
