import PeriodPicker from './PeriodPicker';
import styles from './SectionHeader.module.css';

interface SectionHeaderProps {
  periodMeta: string;
  title: React.ReactNode;
}

export default function SectionHeader({ periodMeta, title }: SectionHeaderProps) {
  return (
    <div className={styles.headerStrip}>
      <div className="wrap">
        <div className={styles.headerRow}>
          <div>
            <div className={styles.periodMeta}>{periodMeta}</div>
            <h1 className={styles.h1}>{title}</h1>
          </div>
          <PeriodPicker />
        </div>
      </div>
    </div>
  );
}
