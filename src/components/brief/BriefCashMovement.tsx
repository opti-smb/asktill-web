import { fmtMoney } from '../../lib/analyzeResponse';
import styles from './BriefCashMovement.module.css';

export type CashMovementModel = {
  start: number | null;
  posIn: number | null;
  ecomIn: number | null;
  billsOut: number | null;
  end: number | null;
  /** Bank MTD inflow — replaces POS + e-commerce when linked. */
  bankIn?: number | null;
  bankLinked?: boolean;
  rangeLabel?: string | null;
};

type Props = {
  model: CashMovementModel;
};

type Bar = { key: string; label: string; value: number | null; color: string };

export default function BriefCashMovement({ model }: Props) {
  const bankMode = Boolean(model.bankLinked && model.bankIn != null);
  const bars: Bar[] = bankMode
    ? [
        { key: 'start', label: 'Start Balance', value: model.start, color: '#7c3aed' },
        { key: 'in', label: 'Money In', value: model.bankIn ?? null, color: '#0f8a57' },
        { key: 'bills', label: 'Money Out', value: model.billsOut, color: '#dc2626' },
        { key: 'end', label: 'End Balance', value: model.end, color: '#6d28d9' },
      ]
    : [
        { key: 'start', label: 'Start Balance', value: model.start, color: '#7c3aed' },
        { key: 'pos', label: 'POS In', value: model.posIn, color: '#0f8a57' },
        { key: 'ecom', label: 'E-commerce In', value: model.ecomIn, color: '#16a34a' },
        { key: 'bills', label: 'Bills & Expenses', value: model.billsOut, color: '#dc2626' },
        { key: 'end', label: 'End Balance', value: model.end, color: '#6d28d9' },
      ];

  const nums = bars.map((b) => Math.abs(b.value ?? 0));
  const max = Math.max(...nums, 1);
  const inflows = bankMode
    ? (model.bankIn ?? 0)
    : (model.posIn ?? 0) + (model.ecomIn ?? 0);
  const hasInflows = bankMode
    ? model.bankIn != null
    : model.posIn != null || model.ecomIn != null;
  const hasAny = bars.some((b) => b.value != null);
  const bankTitle = model.rangeLabel
    ? `Linked bank · ${model.rangeLabel}`
    : 'Linked bank · month to date';

  return (
    <section className={styles.card}>
      <div className={styles.head}>
        <h2 className={styles.title}>
          Cash movement this month
          <i
            className={`ti ti-info-circle ${styles.info}`}
            aria-hidden
            title={bankMode ? bankTitle : 'From your statement'}
          />
        </h2>
        {bankMode && model.rangeLabel ? (
          <p className={styles.subtitle}>{bankTitle}</p>
        ) : null}
      </div>
      {!hasAny ? (
        <p className={styles.empty}>No cash movement amounts for this period yet.</p>
      ) : (
        <div className={styles.body}>
          <div className={styles.chart}>
            {bars.map((bar) => {
              const h =
                bar.value == null ? 0 : Math.max(8, Math.round((Math.abs(bar.value) / max) * 160));
              return (
                <div key={bar.key} className={styles.col}>
                  <div className={styles.amount}>
                    {bar.value == null ? '—' : fmtMoney(bar.value)}
                  </div>
                  <div className={styles.barTrack}>
                    {bar.value != null ? (
                      <div
                        className={styles.bar}
                        style={{ height: h, background: bar.color }}
                        title={bar.label}
                      />
                    ) : null}
                  </div>
                  <div className={styles.barLabel}>{bar.label}</div>
                </div>
              );
            })}
          </div>

          <aside className={styles.summary}>
            <div className={styles.row}>
              <span>Start balance</span>
              <strong>{model.start == null ? '—' : fmtMoney(model.start)}</strong>
            </div>
            <div className={`${styles.row} ${styles.in}`}>
              <span>Total inflows</span>
              <strong>{!hasInflows ? '—' : fmtMoney(inflows)}</strong>
            </div>
            <div className={`${styles.row} ${styles.out}`}>
              <span>Total outflows</span>
              <strong>{model.billsOut == null ? '—' : fmtMoney(model.billsOut)}</strong>
            </div>
            <div className={styles.endBox}>
              <span>End balance</span>
              <strong>{model.end == null ? '—' : fmtMoney(model.end)}</strong>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
