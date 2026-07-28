import type { ChangeEvent } from 'react';
import styles from '../../pages/CalculatorsPage.module.css';

type FieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  full?: boolean;
  readOnly?: boolean;
};

export default function Field({ label, name, value, onChange, full, readOnly }: FieldProps) {
  return (
    <label className={`${styles.field} ${full ? styles.fieldFull : ''}`}>
      <span className={styles.label}>{label}</span>
      <input
        className={styles.input}
        name={name}
        id={`calc-field-${name}`}
        inputMode="decimal"
        value={value}
        readOnly={readOnly}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(name, e.target.value)}
      />
    </label>
  );
}
