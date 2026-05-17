import { usePeriod } from '../../context/PeriodContext';
import type { Period } from '../../types';
import styles from './PeriodPicker.module.css';

const periods: Period[] = ['Week', 'Month', 'Quarter'];

export default function PeriodPicker() {
  const { period, setPeriod } = usePeriod();

  return (
    <div className={styles.periodPicker}>
      {periods.map((p) => (
        <button
          key={p}
          className={`${styles.periodBtn} ${period === p ? styles.active : ''}`}
          onClick={() => setPeriod(p)}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
