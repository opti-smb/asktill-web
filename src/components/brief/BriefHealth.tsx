import styles from './BriefHealth.module.css';

export type HealthCard = {
  id: string;
  label: string;
  status: string;
  score: number;
  tone: 'good' | 'watch' | 'bad';
};

type Props = {
  cards: HealthCard[];
  overall: number | null;
  spark: number[];
};

export default function BriefHealth({ cards, overall, spark }: Props) {
  if (!cards.length && overall == null) {
    return (
      <section className={styles.section}>
        <div className={styles.head}>
          <h2 className={styles.title}>Business health check</h2>
        </div>
        <p className={styles.empty}>Health metrics appear when runway, margin, fees, or reconciliation data is available.</p>
      </section>
    );
  }

  const pts = spark.length ? spark : overall != null ? [overall] : [0];
  const max = Math.max(...pts, 1);
  const min = Math.min(...pts, 0);
  const range = Math.max(max - min, 1);
  const w = 120;
  const h = 36;
  const poly = pts
    .map((v, i) => {
      const x = pts.length === 1 ? w / 2 : (i / Math.max(pts.length - 1, 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <h2 className={styles.title}>Business health check</h2>
      </div>
      <div className={styles.row}>
        {cards.map((card) => (
          <article key={card.id} className={styles.card}>
            <div className={`${styles.statusIcon} ${styles[card.tone]}`}>
              <i
                className={`ti ${card.tone === 'good' ? 'ti-check' : 'ti-alert-triangle'}`}
                aria-hidden
              />
            </div>
            <div className={styles.label}>{card.label}</div>
            <div className={`${styles.status} ${styles[card.tone]}`}>{card.status}</div>
            <div className={styles.score}>{card.score}/100</div>
          </article>
        ))}
        {overall != null ? (
          <article className={styles.overall}>
            <div className={styles.overallLabel}>Overall Score</div>
            <div className={styles.overallScore}>
              {overall} <span>/ 100</span>
            </div>
            <svg className={styles.spark} viewBox={`0 0 ${w} ${h}`} aria-hidden>
              {pts.length === 1 ? (
                <circle cx={w / 2} cy={h / 2} r="3" fill="#0f8a57" />
              ) : (
                <polyline
                  fill="none"
                  stroke="#0f8a57"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={poly}
                />
              )}
            </svg>
          </article>
        ) : null}
      </div>
    </section>
  );
}
