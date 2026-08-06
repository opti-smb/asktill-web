import { fmtMoney } from '../../lib/analyzeResponse';
import styles from './BriefBreakdown.module.css';

export type BreakdownSlice = {
  id: string;
  label: string;
  value: number;
  color: string;
};

type DonutProps = {
  title: string;
  total: number | null;
  slices: BreakdownSlice[];
};

function DonutCard({ title, total, slices }: DonutProps) {
  const sum = slices.reduce((a, s) => a + Math.max(0, s.value), 0) || 1;
  const r = 42;
  const c = 2 * Math.PI * r;
  let offset = 0;

  if (!slices.length) {
    return (
      <article className={styles.card}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.empty}>No breakdown for this period yet.</p>
      </article>
    );
  }

  return (
    <article className={styles.card}>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.body}>
        <div className={styles.donutWrap}>
          <svg className={styles.donut} viewBox="0 0 120 120" aria-hidden>
            <circle cx="60" cy="60" r={r} className={styles.track} />
            {slices.map((slice) => {
              const pct = Math.max(0, slice.value) / sum;
              const len = pct * c;
              const el = (
                <circle
                  key={slice.id}
                  cx="60"
                  cy="60"
                  r={r}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth="16"
                  strokeDasharray={`${len} ${c - len}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                />
              );
              offset += len;
              return el;
            })}
          </svg>
          <div className={styles.center}>
            <div className={styles.centerLabel}>Total</div>
            <div className={styles.centerValue}>
              {total == null ? '—' : fmtMoney(total)}
            </div>
          </div>
        </div>
        <ul className={styles.legend}>
          {slices.map((slice) => {
            const pct = ((Math.max(0, slice.value) / sum) * 100).toFixed(0);
            return (
              <li key={slice.id}>
                <span className={styles.swatch} style={{ background: slice.color }} />
                <span className={styles.legLabel}>{slice.label}</span>
                <span className={styles.legVal}>
                  {fmtMoney(slice.value)}
                  <em>{pct}%</em>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </article>
  );
}

type Props = {
  income: BreakdownSlice[];
  incomeTotal: number | null;
  spend: BreakdownSlice[];
  spendTotal: number | null;
};

export default function BriefBreakdown({ income, incomeTotal, spend, spendTotal }: Props) {
  return (
    <div className={styles.grid}>
      <DonutCard title="Where your money came from" total={incomeTotal} slices={income} />
      <DonutCard title="Where your money went" total={spendTotal} slices={spend} />
    </div>
  );
}
