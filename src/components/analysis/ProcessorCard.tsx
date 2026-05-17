import styles from './ProcessorCard.module.css';

interface CompRow {
  label: string;
  width: string;
  fill: string;
  value: string;
  valueColor?: string;
}

interface ProcessorCardProps {
  iconType: 'pos' | 'ecomm';
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  stat1Label: string;
  stat1Value: string;
  stat1Range: string;
  stat1Delta: string;
  stat1DeltaType: string;
  stat2Label: string;
  stat2Value: string;
  stat2Range: string;
  stat2Delta: string;
  stat2DeltaType: string;
  compRows: CompRow[];
}

export default function ProcessorCard({
  iconType,
  icon,
  title,
  subtitle,
  stat1Label,
  stat1Value,
  stat1Range,
  stat1Delta,
  stat1DeltaType,
  stat2Label,
  stat2Value,
  stat2Range,
  stat2Delta,
  stat2DeltaType,
  compRows,
}: ProcessorCardProps) {
  return (
    <div className={styles.processorCard}>
      <div className={styles.processorHeader}>
        <div className={`${styles.processorIcon} ${styles[iconType]}`}>{icon}</div>
        <div>
          <div className={styles.processorTitle}>{title}</div>
          <div className={styles.processorSubtitle}>{subtitle}</div>
        </div>
      </div>

      <div className={styles.processorStats}>
        <div className={styles.procStat}>
          <div className={styles.procStatLabel}>{stat1Label}</div>
          <div className={styles.procStatValue}>{stat1Value}</div>
          <div className={styles.procStatRange}>{stat1Range}</div>
          <div className={`${styles.procStatDelta} ${styles[stat1DeltaType]}`}>{stat1Delta}</div>
        </div>
        <div className={styles.procStat}>
          <div className={styles.procStatLabel}>{stat2Label}</div>
          <div className={styles.procStatValue}>{stat2Value}</div>
          <div className={styles.procStatRange}>{stat2Range}</div>
          <div className={`${styles.procStatDelta} ${styles[stat2DeltaType]}`}>{stat2Delta}</div>
        </div>
      </div>

      <div className={styles.compBar}>
        {compRows.map((row, i) => (
          <div key={i} className={styles.compRow}>
            <div className={styles.compLabel}>{row.label}</div>
            <div className={styles.compTrack}>
              <div className={styles.compFill} style={{ width: row.width, background: row.fill }} />
            </div>
            <div className={styles.compValue} style={row.valueColor ? { color: row.valueColor } : undefined}>
              {row.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
