import { useEffect, useMemo, useState } from 'react';
import { fmtMoney, type WeekReportSliceApi, type WeekReportsViewApi } from '../../lib/analyzeResponse';
import styles from './PostmanPanels.module.css';
import weekStyles from './WeekReportPanel.module.css';

function ChannelTable({ week }: { week: WeekReportSliceApi }) {
  const rows = [
    week.pos ? { ...week.pos, key: 'pos' } : null,
    week.ecommerce ? { ...week.ecommerce, key: 'ecommerce' } : null,
    week.bank ? { ...week.bank, key: 'bank' } : null,
  ].filter(Boolean) as Array<WeekReportSliceApi['pos'] & { key: string }>;

  if (!rows.length) {
    return (
      <p className={weekStyles.empty}>
        No dated POS, e-commerce, or bank rows found for this week in your uploads.
      </p>
    );
  }

  return (
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
          {rows.map((row) => (
            <tr key={row.key}>
              <td>
                <div>{row.label}</div>
                {row.activity_count ? (
                  <div className={weekStyles.activity}>
                    {row.activity_count} {row.activity_label}
                  </div>
                ) : null}
              </td>
              <td>{fmtMoney(row.gross_sales)}</td>
              <td>{fmtMoney(row.refunds)}</td>
              <td>{fmtMoney(row.net_sales ?? row.gross_sales)}</td>
              <td>{fmtMoney(row.fees)}</td>
              <td>{fmtMoney(row.net_to_bank)}</td>
            </tr>
          ))}
          <tr className={styles.totalRow}>
            <td>
              <strong>WEEK TOTAL</strong>
            </td>
            <td>
              <strong>{fmtMoney(week.total_gross)}</strong>
            </td>
            <td>—</td>
            <td>—</td>
            <td>
              <strong>{fmtMoney(week.total_fees)}</strong>
            </td>
            <td>
              <strong>{fmtMoney(week.total_net_to_bank)}</strong>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
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

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <h2 className={styles.title}>Weekly report</h2>
        <p className={styles.sub}>
          {weekReports.period_label
            ? `${weekReports.period_label} · grouped from dated POS days, e-commerce orders, and bank credits`
            : 'Grouped from dated POS days, e-commerce orders, and bank credits in your uploads'}
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
            <ChannelTable week={selectedWeek} />
          </div>

          {(selectedWeek.bank_credits != null || selectedWeek.difference != null) && (
            <div className={styles.block}>
              <h3 className={styles.blockTitle}>Bank reconciliation</h3>
              <dl className={styles.dl}>
                <dt>Expected processor payouts</dt>
                <dd>{fmtMoney(selectedWeek.total_net_to_bank)}</dd>
                <dt>Bank credits this week</dt>
                <dd>{fmtMoney(selectedWeek.bank_credits)}</dd>
                <dt>Difference</dt>
                <dd>{fmtMoney(selectedWeek.difference)}</dd>
              </dl>
            </div>
          )}

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
