import type { ReactNode } from 'react';
import type { RiskReading } from '@asktill/calculators';
import RiskGauge from './RiskGauge';
import styles from '../../pages/CalculatorsPage.module.css';

type ResultBlockProps = {
  title: string;
  main?: string;
  sub?: string;
  formula?: string;
  tip?: string;
  assumptions?: string;
  risk?: RiskReading | null;
  children?: ReactNode;
};

export default function ResultBlock({
  title,
  main,
  sub,
  formula,
  tip,
  assumptions,
  risk,
  children,
}: ResultBlockProps) {
  return (
    <div className={styles.result}>
      <div className={styles.resultTitle}>{title}</div>
      {main ? <div className={styles.resultMain}>{main}</div> : null}
      {sub ? <div className={styles.resultSub}>{sub}</div> : null}
      {risk ? <RiskGauge reading={risk} /> : null}
      {children}
      {formula ? (
        <div className={styles.formulaBox}>
          <div className={styles.formulaLabel}>Formula used</div>
          <pre className={styles.formula}>{formula}</pre>
        </div>
      ) : null}
      {assumptions ? (
        <div className={styles.assumeBox} role="note">
          <div className={styles.assumeLabel}>What’s included</div>
          <p className={styles.assumeText}>{assumptions}</p>
        </div>
      ) : null}
      {tip ? (
        <div className={styles.tipBox} role="note">
          <div className={styles.tipLabel}>Friendly tip</div>
          <p className={styles.tipText}>{tip}</p>
        </div>
      ) : null}
    </div>
  );
}
