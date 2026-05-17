import type { KPI } from '../../types';
import styles from './KPICard.module.css';

interface KPICardProps {
  kpi: KPI;
}

export default function KPICard({ kpi }: KPICardProps) {
  const labelX = [31, 89, 147];

  return (
    <div className={styles.kpi}>
      <div className={styles.kpiLabel}>{kpi.label}</div>
      <div className={styles.kpiValue}>{kpi.value}</div>
      <div className={styles.kpiComparison}>
        <span className={`${styles.kpiDelta} ${styles[kpi.deltaType]}`}>{kpi.delta}</span>
        <span className={styles.kpiPrev}>{kpi.prev}</span>
      </div>
      <svg className={styles.spark} viewBox="0 0 200 32" preserveAspectRatio="none" style={{ height: 32 }}>
        {kpi.sparkBars.map((bar, i) => (
          <g key={bar.x}>
            <rect x={bar.x} y={bar.y} width="50" height={bar.height} rx="2" fill={bar.fill} />
            {bar.label && (
              <text
                x={labelX[i]}
                y={bar.y - 2}
                textAnchor="middle"
                fontFamily="Inter"
                fontSize="7"
                fill={bar.labelFill}
                fontWeight={i === 2 ? '700' : undefined}
              >
                {bar.label}
              </text>
            )}
          </g>
        ))}
      </svg>
      <div className={styles.kpiAvg}>
        {kpi.avgLabel} ·{' '}
        <span className={styles[`avgNote_${kpi.avgNoteType}`]}>{kpi.avgNote}</span>
      </div>
    </div>
  );
}
