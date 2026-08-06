import { fmtMoney } from '../../lib/analyzeResponse';
import styles from './BriefTrends.module.css';

export type TrendSeries = {
  id: string;
  label: string;
  caption: string;
  values: number[];
  color: string;
  fill: string;
};

type Props = {
  months: string[];
  monthTitles: string[];
  series: TrendSeries[];
  loading?: boolean;
  /** e.g. "last 6 months" or a single period label */
  rangeLabel?: string;
};

function axisMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    const v = n / 1_000_000;
    return `$${Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1)}M`;
  }
  if (abs >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${Math.round(n)}`;
}

function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0];
  if (min === max) {
    const pad = Math.max(Math.abs(min) * 0.2, 1);
    return niceTicks(min - pad, max + pad, count);
  }
  const span = max - min;
  const step = span / (count - 1);
  const raw: number[] = [];
  for (let i = 0; i < count; i += 1) raw.push(min + step * i);
  return raw;
}

function Chart({
  id,
  values,
  months,
  color,
  fill,
}: {
  id: string;
  values: number[];
  months: string[];
  color: string;
  fill: string;
}) {
  const w = 320;
  const h = 148;
  const padL = 36;
  const padR = 10;
  const padT = 12;
  const padB = 22;
  const safe = values.length ? values : [0];
  const dataMin = Math.min(...safe);
  const dataMax = Math.max(...safe);
  const pad = Math.max((dataMax - dataMin) * 0.12, Math.abs(dataMax) * 0.05, 1);
  const yMin = Math.max(0, dataMin - pad);
  const yMax = dataMax + pad;
  const range = Math.max(yMax - yMin, 1);
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const yTicks = niceTicks(yMin, yMax, 4);

  const coords = safe.map((v, i) => {
    const x =
      safe.length === 1 ? padL + plotW / 2 : padL + (i / Math.max(safe.length - 1, 1)) * plotW;
    const y = padT + (1 - (v - yMin) / range) * plotH;
    return { x, y, v };
  });

  const linePts = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const areaD =
    coords.length === 0
      ? ''
      : [
          `M ${coords[0]!.x} ${padT + plotH}`,
          `L ${coords[0]!.x} ${coords[0]!.y}`,
          ...coords.slice(1).map((c) => `L ${c.x} ${c.y}`),
          `L ${coords[coords.length - 1]!.x} ${padT + plotH}`,
          'Z',
        ].join(' ');

  const gradId = `trend-fill-${id}`;

  return (
    <svg className={styles.chart} viewBox={`0 0 ${w} ${h}`} role="img" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity="0.55" />
          <stop offset="100%" stopColor={fill} stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {yTicks.map((tick, i) => {
        const y = padT + (1 - (tick - yMin) / range) * plotH;
        return (
          <g key={`y-${i}`}>
            <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="#eef2f7" strokeWidth="1" />
            <text x={padL - 6} y={y + 3} textAnchor="end" className={styles.yLabel}>
              {axisMoney(tick)}
            </text>
          </g>
        );
      })}

      {areaD ? <path d={areaD} fill={`url(#${gradId})`} /> : null}

      {coords.length === 1 ? (
        <circle cx={coords[0]!.x} cy={coords[0]!.y} r="4.5" fill={color} />
      ) : (
        <>
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2.4"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={linePts}
          />
          {coords.map((c, i) => (
            <circle key={`p-${i}`} cx={c.x} cy={c.y} r="3.6" fill={color} />
          ))}
        </>
      )}

      {months.map((m, i) => {
        const x =
          months.length === 1
            ? padL + plotW / 2
            : padL + (i / Math.max(months.length - 1, 1)) * plotW;
        return (
          <text key={`x-${m}-${i}`} x={x} y={h - 4} textAnchor="middle" className={styles.xLabel}>
            {m.replace(/\s+\d{4}$/, '')}
          </text>
        );
      })}
    </svg>
  );
}

export default function BriefTrends({
  months,
  monthTitles,
  series,
  loading,
  rangeLabel = 'last 6 months',
}: Props) {
  if (!series.length) {
    return (
      <section className={styles.section}>
        <div className={styles.head}>
          <h2 className={styles.title}>
            Trends
            {rangeLabel ? <span className={styles.titleMuted}> ({rangeLabel})</span> : null}
          </h2>
          <i
            className={`ti ti-info-circle ${styles.info}`}
            title="Cash, revenue, and expenses across your uploaded months"
            aria-hidden
          />
        </div>
        <p className={styles.empty}>
          {loading ? 'Loading months…' : 'Trends appear when statement months have values.'}
        </p>
      </section>
    );
  }

  const lastIdx = Math.max(months.length - 1, 0);
  const endTitle = monthTitles[lastIdx] || months[lastIdx] || '';

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <h2 className={styles.title}>
          Trends
          {rangeLabel ? <span className={styles.titleMuted}> ({rangeLabel})</span> : null}
        </h2>
        <i
          className={`ti ti-info-circle ${styles.info}`}
          title={
            months.length <= 1
              ? 'This month only — no multi-month comparison'
              : 'Up to your last 6 uploaded months ending at the current statement'
          }
          aria-hidden
        />
        {loading ? <span className={styles.loading}>Updating…</span> : null}
      </div>
      <div className={styles.grid}>
        {series.map((s) => {
          const last = s.values[s.values.length - 1] ?? 0;
          return (
            <article key={s.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.label}>{s.label}</div>
                <div className={styles.caption}>
                  {months.length <= 1 ? 'This month' : s.caption}
                </div>
                <div className={styles.value}>{fmtMoney(last)}</div>
                {endTitle ? <div className={styles.endMonth}>{endTitle}</div> : null}
              </div>
              <Chart id={s.id} values={s.values} months={months} color={s.color} fill={s.fill} />
            </article>
          );
        })}
      </div>
    </section>
  );
}
