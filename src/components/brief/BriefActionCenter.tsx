import { Link } from 'react-router-dom';
import styles from './BriefActionCenter.module.css';

const ACTIONS = [
  {
    id: 'qb',
    title: 'Connect QuickBooks',
    body: 'Sync books for fuller cash and expense detail.',
    icon: 'ti-plug-connected',
    to: '/dashboard/sources',
  },
  {
    id: 'upload',
    title: 'Upload next statement',
    body: 'Keep your brief current with the latest month.',
    icon: 'ti-upload',
    to: '/onboarding',
  },
  {
    id: 'fees',
    title: 'Review processor fees',
    body: 'See where fees are eating margin.',
    icon: 'ti-receipt',
    to: '/dashboard/rewards',
  },
  {
    id: 'tax',
    title: 'Schedule tax review',
    body: 'Talk with an advisor when you’re ready.',
    icon: 'ti-calendar-event',
    to: '/dashboard/channel-partners',
  },
] as const;

export default function BriefActionCenter() {
  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <h2 className={styles.title}>Action center</h2>
      </div>
      <div className={styles.row}>
        {ACTIONS.map((a) => (
          <Link key={a.id} to={a.to} className={styles.card}>
            <span className={styles.icon}>
              <i className={`ti ${a.icon}`} aria-hidden />
            </span>
            <span className={styles.text}>
              <span className={styles.cardTitle}>{a.title}</span>
              <span className={styles.body}>{a.body}</span>
            </span>
            <i className={`ti ti-chevron-right ${styles.chev}`} aria-hidden />
          </Link>
        ))}
      </div>
    </section>
  );
}
