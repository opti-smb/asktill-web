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
  const progress = compRows[0];

  return (
    <div className={`${styles.processorCard} ${styles[iconType]}`}>
      <div className={styles.processorHeader}>
        <div className={`${styles.processorIcon} ${styles[`icon_${iconType}`]}`}>{icon}</div>
        <div className={styles.headerCopy}>
          <div className={styles.processorTitle}>{title}</div>
          <div className={styles.processorSubtitle}>{subtitle}</div>
        </div>
      </div>

      {(stat1Range || stat2Range) && (
        <div className={styles.metaLine}>
          {stat1Range ? <span>{stat1Range}</span> : null}
          {stat1Range && stat2Range ? <span className={styles.metaDot}>·</span> : null}
          {stat2Range ? <span>{stat2Range}</span> : null}
          {stat1Delta && stat1Delta !== '—' ? (
            <span className={`${styles.inlineDelta} ${styles[stat1DeltaType]}`}>{stat1Delta}</span>
          ) : null}
          {stat2Delta && stat2Delta !== '—' ? (
            <span className={`${styles.inlineDelta} ${styles[stat2DeltaType]}`}>{stat2Delta}</span>
          ) : null}
        </div>
      )}

      <div className={styles.processorStats}>
        <div className={styles.procStat}>
          <div className={styles.procStatLabel}>{stat1Label}</div>
          <div className={styles.procStatValue}>{stat1Value}</div>
        </div>
        <div className={styles.procStat}>
          <div className={styles.procStatLabel}>{stat2Label}</div>
          <div className={styles.procStatValue}>{stat2Value}</div>
        </div>
      </div>

      {progress ? (
        <div className={styles.compBar}>
          <div className={styles.compRow}>
            <div className={styles.compLabel}>{progress.label}</div>
            <div className={styles.compTrack}>
              <div
                className={styles.compFill}
                style={{ width: progress.width, background: progress.fill }}
              />
            </div>
            <div
              className={styles.compValue}
              style={progress.valueColor ? { color: progress.valueColor } : undefined}
            >
              {progress.value}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
