/** Small professional risk meter — threshold bar with a clear value arrow. */

import type { CSSProperties } from 'react';
import {
  formatRiskValue,
  riskGaugeDomain,
  type RiskLevel,
  type RiskReading,
} from '@asktill/calculators';
import styles from './RiskGauge.module.css';

const LEVEL_COLOR: Record<RiskLevel, string> = {
  high: '#E11D48', // red — risk
  moderate: '#EAB308', // yellow — moderate
  low: '#16A34A', // green — good
};

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function tOf(value: number, min: number, max: number): number {
  if (!(max > min)) return 0.5;
  return clamp01((value - min) / (max - min));
}

type Props = {
  reading: RiskReading;
};

export default function RiskGauge({ reading }: Props) {
  const { min, max } = riskGaugeDomain(reading);
  const higher = reading.direction === 'higher_better';
  const tHigh = tOf(reading.highRisk, min, max);
  const tLow = tOf(reading.lowRisk, min, max);
  const tValue = tOf(reading.value, min, max);
  const color = LEVEL_COLOR[reading.level];

  const zones = higher
    ? [
        { t0: 0, t1: tHigh, level: 'high' as const },
        { t0: tHigh, t1: tLow, level: 'moderate' as const },
        { t0: tLow, t1: 1, level: 'low' as const },
      ]
    : [
        { t0: 0, t1: tLow, level: 'low' as const },
        { t0: tLow, t1: tHigh, level: 'moderate' as const },
        { t0: tHigh, t1: 1, level: 'high' as const },
      ];

  // ViewBox: room above for arrow + value label
  const left = 0;
  const width = 240;
  const trackY = 22;
  const trackH = 5;
  const xAt = (t: number) => left + t * width;
  const ax = xAt(tValue);

  return (
    <div
      className={styles.wrap}
      style={{ '--risk-color': color } as CSSProperties}
      role="img"
      aria-label={`${reading.levelLabel}: ${reading.metricLabel} ${formatRiskValue(reading)}`}
    >
      <div className={styles.top}>
        <span className={styles.label}>{reading.metricLabel}</span>
        <span className={`${styles.status} ${styles[`status_${reading.level}`]}`}>
          {reading.level === 'low' ? 'Good' : reading.levelLabel}
        </span>
      </div>

      <svg className={styles.svg} viewBox="0 0 240 42" aria-hidden>
        {/* Soft track backdrop */}
        <rect
          x={0}
          y={trackY}
          width={width}
          height={trackH}
          rx={trackH / 2}
          fill="#E2E8F0"
        />

        {/* Color zones — tiny white hairlines between (no dark gate ticks) */}
        {zones.map((z, i) => {
          const gap = 1.25;
          const rawX = xAt(z.t0);
          const rawW = (z.t1 - z.t0) * width;
          if (rawW < 1) return null;
          const x = i === 0 ? rawX : rawX + gap / 2;
          const w =
            i === 0
              ? Math.max(0, rawW - gap / 2)
              : i === zones.length - 1
                ? Math.max(0, rawW - gap / 2)
                : Math.max(0, rawW - gap);
          if (w < 0.5) return null;
          const r = trackH / 2;
          return (
            <rect
              key={`${z.level}-${z.t0}`}
              x={x}
              y={trackY}
              width={w}
              height={trackH}
              rx={r}
              fill={LEVEL_COLOR[z.level]}
            />
          );
        })}

        {/* Arrow pointing down onto the track */}
        <g>
          <line
            x1={ax}
            y1={4}
            x2={ax}
            y2={trackY - 1}
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
          />
          <polygon
            points={`${ax},${trackY - 1} ${ax - 5},${trackY - 9} ${ax + 5},${trackY - 9}`}
            fill={color}
          />
        </g>
      </svg>

      <div className={styles.bottom}>
        <span className={styles.edge}>{reading.highLabel}</span>
        <span className={styles.value}>{formatRiskValue(reading)}</span>
        <span className={styles.edge}>{reading.lowLabel}</span>
      </div>
    </div>
  );
}
