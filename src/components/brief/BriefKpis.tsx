import { fmtMoney } from '../../lib/analyzeResponse';
import styles from './BriefKpis.module.css';

export type BriefKpiItem = {
  id: string;
  label: string;
  value: string;
  delta?: string | null;
  deltaTone?: 'up' | 'down' | 'flat' | 'muted';
  footnote?: string | null;
  icon: string;
  iconTone: 'green' | 'red' | 'blue' | 'teal';
};

type Props = {
  items: BriefKpiItem[];
};

const toneClass = {
  green: styles.iconGreen,
  red: styles.iconRed,
  blue: styles.iconBlue,
  teal: styles.iconTeal,
};

const deltaClass = {
  up: styles.deltaUp,
  down: styles.deltaDown,
  flat: styles.deltaFlat,
  muted: styles.deltaMuted,
};

export default function BriefKpis({ items }: Props) {
  return (
    <div className={styles.grid}>
      {items.map((item) => (
        <article key={item.id} className={styles.card}>
          <div className={`${styles.icon} ${toneClass[item.iconTone]}`}>
            <i className={`ti ${item.icon}`} aria-hidden />
          </div>
          <div className={styles.label}>{item.label}</div>
          <div className={styles.value}>{item.value}</div>
          <div className={styles.foot}>
            {item.delta ? (
              <span className={deltaClass[item.deltaTone ?? 'muted']}>{item.delta}</span>
            ) : null}
            {item.footnote ? <span className={styles.note}>{item.footnote}</span> : null}
          </div>
        </article>
      ))}
    </div>
  );
}

export function dashMoney(n: number | null | undefined): string {
  return n != null && Number.isFinite(n) ? fmtMoney(n) : '—';
}
