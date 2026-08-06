import styles from './BriefPriorities.module.css';

export type PriorityItem = {
  id: string;
  title: string;
  value: string;
  caption?: string | null;
  badge: string;
  tone: 'critical' | 'high' | 'watch';
  icon: string;
};

type Props = {
  items: PriorityItem[];
  onViewActionPlan: () => void;
};

export default function BriefPriorities({ items, onViewActionPlan }: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <h2 className={styles.title}>Top priorities</h2>
      </div>
      <div className={styles.row}>
        {!items.length ? (
          <p className={styles.empty}>No priority alerts from this period’s numbers yet.</p>
        ) : (
          items.map((item) => (
            <article key={item.id} className={`${styles.card} ${styles[item.tone]}`}>
              <div className={styles.cardTop}>
                <span className={styles.iconWrap}>
                  <i className={`ti ${item.icon}`} aria-hidden />
                </span>
                <span className={`${styles.badge} ${styles[`badge_${item.tone}`]}`}>{item.badge}</span>
              </div>
              <div className={styles.cardTitle}>{item.title}</div>
              <div className={styles.cardValue}>{item.value}</div>
              {item.caption ? <div className={styles.caption}>{item.caption}</div> : null}
            </article>
          ))
        )}
        <button type="button" className={styles.planBtn} onClick={onViewActionPlan}>
          View action plan
          <i className="ti ti-arrow-right" aria-hidden />
        </button>
      </div>
    </section>
  );
}
