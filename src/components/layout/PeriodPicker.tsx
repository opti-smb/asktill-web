import type { Period } from '../../types';
import styles from './PeriodPicker.module.css';

const periods: Period[] = ['Week', 'Month', 'Quarter'];

interface PeriodPickerProps {
  period: Period;
  onPeriodChange: (period: Period) => void;
}

export default function PeriodPicker({ period, onPeriodChange }: PeriodPickerProps) {
  return (
    <div className={styles.periodPicker}>
      {periods.map((p) => (
        <button
          key={p}
          type="button"
          className={`${styles.periodBtn} ${period === p ? styles.active : ''}`}
          onClick={() => onPeriodChange(p)}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
