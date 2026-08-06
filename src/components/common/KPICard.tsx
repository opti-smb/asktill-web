import type { KPI } from '../../types';
import styles from './KPICard.module.css';

interface KPICardProps {
  kpi: KPI;
}

type Tone = 'blue' | 'green' | 'orange' | 'slate';

function toneForLabel(label: string): Tone {
  const l = label.toLowerCase();
  if (l.includes('revenue') || l.includes('sales')) return 'blue';
  if (l.includes('bank') || l.includes('balance') || l.includes('cash')) return 'green';
  if (l.includes('margin') || l.includes('profit')) return 'orange';
  return 'slate';
}

function iconForTone(tone: Tone) {
  if (tone === 'blue') return <i className="ti ti-currency-dollar" aria-hidden />;
  if (tone === 'green') return <i className="ti ti-building-bank" aria-hidden />;
  if (tone === 'orange') return <i className="ti ti-chart-line" aria-hidden />;
  return <i className="ti ti-calendar-event" aria-hidden />;
}

export default function KPICard({ kpi }: KPICardProps) {
  const tone = toneForLabel(kpi.label);

  return (
    <div className={`${styles.kpi} ${styles[`tone_${tone}`]}`}>
      <div className={styles.kpiTop}>
        <span className={styles.kpiIcon} aria-hidden>
          {iconForTone(tone)}
        </span>
        <div
          className={styles.kpiLabel}
          title={kpi.helperText}
          style={kpi.helperText ? { cursor: 'help' } : undefined}
        >
          {kpi.label}
        </div>
      </div>
      <div className={styles.kpiValue}>{kpi.value}</div>
      <div className={styles.accentBar} aria-hidden />
      {(kpi.delta || kpi.prev) && (
        <div className={styles.kpiComparison}>
          {kpi.delta ? (
            <span className={`${styles.kpiDelta} ${styles[kpi.deltaType]}`}>{kpi.delta}</span>
          ) : (
            <span />
          )}
          {kpi.prev ? <span className={styles.kpiPrev}>{kpi.prev}</span> : null}
        </div>
      )}
      <div className={styles.kpiAvg}>
        {kpi.avgLabel ? (
          <>
            {kpi.avgLabel}
            {kpi.avgNote ? (
              <>
                {' · '}
                <span className={styles[`avgNote_${kpi.avgNoteType}`]}>{kpi.avgNote}</span>
              </>
            ) : null}
          </>
        ) : kpi.avgNote ? (
          <span className={styles[`avgNote_${kpi.avgNoteType}`]}>{kpi.avgNote}</span>
        ) : (
          'Your first month on file'
        )}
      </div>
    </div>
  );
}
