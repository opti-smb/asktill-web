import { Link } from 'react-router-dom';
import styles from './BriefInsights.module.css';

export type InsightCard = {
  id: string;
  title: string;
  value: string;
  body: string;
  cta: string;
  tone: 'green' | 'blue' | 'orange' | 'purple';
  icon: string;
  to?: string;
};

type Props = {
  items: InsightCard[];
};

const toneMap = {
  green: styles.toneGreen,
  blue: styles.toneBlue,
  orange: styles.toneOrange,
  purple: styles.tonePurple,
};

function isLongValue(value: string): boolean {
  return value.length > 28 || /[a-z]{8,}/i.test(value) && value.includes(' ');
}

export default function BriefInsights({ items }: Props) {
  const cols = Math.max(1, Math.min(items.length, 3));

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <h2 className={styles.title}>Insights & recommendations</h2>
      </div>
      {!items.length ? (
        <p className={styles.empty}>Insights appear after your statements are analyzed.</p>
      ) : (
        <div
          className={styles.grid}
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {items.map((item) => {
            const longValue = isLongValue(item.value);
            return (
              <article key={item.id} className={`${styles.card} ${toneMap[item.tone]}`}>
                <div className={styles.cardTop}>
                  <div className={styles.icon}>
                    <i className={`ti ${item.icon}`} aria-hidden />
                  </div>
                  <div className={styles.cardTitle}>{item.title}</div>
                </div>
                <div className={longValue ? styles.valueText : styles.value}>{item.value}</div>
                {item.body ? <p className={styles.body}>{item.body}</p> : null}
                {item.to ? (
                  <Link to={item.to} className={styles.cta}>
                    {item.cta}
                  </Link>
                ) : (
                  <span className={styles.ctaMuted}>{item.cta}</span>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
