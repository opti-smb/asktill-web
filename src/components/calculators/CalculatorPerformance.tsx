import type { CalculatorId } from '@asktill/calculators';
import type { CSSProperties } from 'react';

import {
  bandCssKey,
  scoreBandColor,
  scoreBandLabel,
  type CalculatorPerformance,
  type PerformanceTrend,
} from '../../lib/calculatorPerformance';

import styles from './CalculatorPerformance.module.css';

type Props = {
  performance: CalculatorPerformance;
  onOpenCalculator: (id: CalculatorId) => void;
};

function Sparkline({ values, trend }: { values: (number | null)[]; trend: PerformanceTrend }) {
  if (values.some((v) => v == null) || values.length < 2) {
    return <svg className={styles.spark} width="66" height="24" aria-hidden />;
  }
  const nums = values as number[];
  const lo = Math.min(...nums);
  const hi = Math.max(...nums);
  const span = hi - lo || 1;
  const norm = nums.map((x) => (x - lo) / span);
  const pts = norm.map((y, i) => [6 + i * (54 / Math.max(norm.length - 1, 1)), 20 - y * 16] as const);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  return (
    <svg
      className={`${styles.spark} ${styles[`trend_${trend}`]}`}
      width="66"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d={d} />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="2.2" fill="currentColor" />
      ))}
    </svg>
  );
}

export default function CalculatorPerformancePanel({ performance, onOpenCalculator }: Props) {
  const { months, overallScores, overallTrend, overallTrendLabel, improving, steady, declining, summary, groups } =
    performance;
  const colCount = months.length;
  const gridStyle = {
    '--perf-cols': String(colCount),
  } as CSSProperties;

  const trendBg =
    overallTrend === 'up'
      ? 'var(--letter-pos-soft)'
      : overallTrend === 'down'
        ? 'var(--letter-neg-soft)'
        : 'var(--letter-surface)';
  const trendInk =
    overallTrend === 'up'
      ? 'var(--letter-pos-text)'
      : overallTrend === 'down'
        ? 'var(--letter-neg-text)'
        : 'var(--letter-muted)';

  return (
    <div className={styles.root} style={gridStyle}>
      <div className={styles.directions}>
        <div className={styles.directionsEyebrow}>How to read this</div>
        <p className={styles.prose}>
          Each row is one calculator; the cells are its reading for{' '}
          <b>{months.map((m) => m.shortLabel).join(', ')}</b>, each scored against the same Asktill
          risk thresholds and shaded by band —{' '}
          <span className={styles.legendKey}>
            <i className={styles.dotRed} />
            <b>At risk</b>
          </span>
          <span className={styles.legendKey}>
            <i className={styles.dotAmber} />
            <b>Watch</b>
          </span>
          <span className={styles.legendKey}>
            <i className={styles.dotGreen} />
            <b>Healthy</b>
          </span>
          . The <b>Trend</b> column shows direction across months. Click a row to open that
          calculator for the latest month.
        </p>
      </div>

      <div className={styles.overall}>
        <div className={styles.ovLeft}>
          <h2 className={styles.ovTitle}>Overall financial health</h2>
          <div className={styles.scores}>
            {months.map((m, i) => {
              const score = overallScores[i] ?? 0;
              const color = scoreBandColor(score);
              return (
                <div key={m.statementId} className={styles.scoreRow}>
                  <div className={styles.schip}>
                    <div className={styles.schipM}>{m.shortLabel}</div>
                    <div className={styles.schipN} style={{ color }}>
                      {score}
                    </div>
                    <div className={styles.schipBd} style={{ color }}>
                      {scoreBandLabel(score)}
                    </div>
                  </div>
                  {i < months.length - 1 ? <span className={styles.arrow}>→</span> : null}
                </div>
              );
            })}
          </div>
          <p className={`${styles.ovSum} ${styles.prose}`}>{summary}</p>
        </div>
        <div className={styles.ovRight}>
          <div className={styles.bigTrend} style={{ background: trendBg, color: trendInk }}>
            {overallTrend === 'up' ? '↑' : overallTrend === 'down' ? '↓' : '→'} {overallTrendLabel}
          </div>
          <div className={styles.movers}>
            <b className={styles.moverUp}>{improving}</b> improving ·{' '}
            <b className={styles.moverFlat}>{steady}</b> steady ·{' '}
            <b className={styles.moverDown}>{declining}</b> declining
          </div>
        </div>
      </div>

      <div className={styles.mhead} aria-hidden>
        <div className={`${styles.mh} ${styles.mhName}`}>Calculator</div>
        {months.map((m) => (
          <div key={m.statementId} className={`${styles.mh} ${styles.mhMonth}`}>
            {m.shortLabel}
          </div>
        ))}
        <div className={styles.mh}>Trend</div>
      </div>

      {groups.map((group) => (
        <section key={group.id} className={styles.cat}>
          <div className={styles.catHd}>
            <h3>{group.title}</h3>
            <span className={styles.cnum}>{group.rows.length}</span>
          </div>
          <div className={styles.rows}>
            {group.rows.map((row) => (
              <button
                key={row.id}
                type="button"
                className={styles.calc}
                onClick={() => onOpenCalculator(row.id)}
              >
                <div className={styles.cName}>
                  <div className={styles.calcName}>{row.meta.name}</div>
                  <div className={styles.calcQ}>{row.meta.question}</div>
                  <div className={styles.metricLab}>{row.metricLabel}</div>
                </div>
                {row.cells.map((cell, i) => {
                  const k = bandCssKey(cell.band);
                  const unit = cell.displayUnit ? ` ${cell.displayUnit}` : '';
                  const isInfo = cell.band === 'na';
                  return (
                    <div key={`${row.id}-${months[i]?.statementId ?? i}`} className={`${styles.mcell} ${styles[`mcell_${k}`]}`}>
                      <div className={isInfo ? styles.mvalTxt : styles.mval}>
                        {cell.displayMain}
                        {unit ? <span>{unit}</span> : null}
                      </div>
                      <div className={styles.mband}>
                        <i />
                        {isInfo ? cell.pillLabel.toLowerCase() : cell.pillLabel}
                      </div>
                    </div>
                  );
                })}
                <div className={`${styles.trend} ${styles[`trend_${row.trend}`]}`}>
                  <Sparkline values={row.healthFracs} trend={row.trend} />
                  <span className={styles.tlabel}>{row.trendLabel}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}

      <p className={styles.foot}>
        Asktill Calculator Performance — readings from your saved statement months, scored with the
        same calculator risk thresholds as month-only view.
      </p>
    </div>
  );
}
