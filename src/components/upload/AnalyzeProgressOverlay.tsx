import type { AnalyzeProgressState } from '../../lib/analyzeProgress';
import styles from './AnalyzeProgressOverlay.module.css';

interface Props {
  progress: AnalyzeProgressState;
}

export default function AnalyzeProgressOverlay({ progress }: Props) {
  const { steps, activeIndex } = progress;

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-labelledby="analyze-progress-title">
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.spinner} aria-hidden />
          <div>
            <h2 id="analyze-progress-title" className={styles.title}>
              Analyzing your statements
            </h2>
            <p className={styles.subtitle}>
              Steps update as the server processes your files.
            </p>
          </div>
        </div>

        <ul className={styles.log}>
          {steps.map((step, index) => {
            const done = index < activeIndex;
            const active = index === activeIndex && activeIndex < steps.length;
            const pending = index > activeIndex;
            return (
              <li
                key={step.id}
                className={`${styles.row} ${done ? styles.done : ''} ${active ? styles.active : ''} ${pending ? styles.pending : ''}`}
              >
                <span className={styles.icon} aria-hidden>
                  {done ? '✓' : active ? '●' : '○'}
                </span>
                <span className={styles.messageWrap}>
                  <span className={styles.message}>{step.message}</span>
                  {active && step.detail ? (
                    <span className={styles.detail}>{step.detail}</span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
