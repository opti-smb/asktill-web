import type { AnalyzeProgressState } from '../../lib/analyzeProgress';
import {
  DASHBOARD_SUB_STEP_END,
  DASHBOARD_SUB_STEP_START,
  dashboardLiveDetail,
  isPipelineDisplayComplete,
  MAIN_PIPELINE_STEP_COUNT,
} from '../../lib/analyzeProgress';
import styles from './AnalyzeProgressOverlay.module.css';

interface Props {
  progress: AnalyzeProgressState;
}

function subtitleForProgress(progress: AnalyzeProgressState, allDone: boolean): string {
  const { displayIndex, targetIndex, complete } = progress;
  if (allDone) {
    return 'Your numbers are ready — taking you to the dashboard.';
  }
  if (complete) {
    return 'Finishing up — almost there.';
  }
  if (targetIndex >= DASHBOARD_SUB_STEP_START) {
    return 'Building your dashboard — status updates as each part completes.';
  }
  if (displayIndex === 0 && targetIndex === 0) {
    return 'Uploading to the server — this can take longer on production than local dev.';
  }
  return 'Steps update live as the server processes your files.';
}

export default function AnalyzeProgressOverlay({ progress }: Props) {
  const { steps, displayIndex, targetIndex } = progress;
  const allDone = isPipelineDisplayComplete(progress);
  const inDashboardPhase = displayIndex >= DASHBOARD_SUB_STEP_START || targetIndex >= DASHBOARD_SUB_STEP_START;

  const mainSteps = steps.slice(0, MAIN_PIPELINE_STEP_COUNT);

  const dashboardDone = allDone || displayIndex > DASHBOARD_SUB_STEP_END;
  const dashboardActive = inDashboardPhase && !dashboardDone;
  const dashboardDetail = dashboardActive ? dashboardLiveDetail(progress) : null;

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-labelledby="analyze-progress-title">
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={allDone ? styles.doneIcon : styles.spinner} aria-hidden>
            {allDone ? '✓' : null}
          </div>
          <div>
            <h2 id="analyze-progress-title" className={styles.title}>
              {allDone ? 'Analysis complete' : 'Analyzing your statements'}
            </h2>
            <p className={styles.subtitle}>{subtitleForProgress(progress, allDone)}</p>
          </div>
        </div>

        <ul className={styles.log}>
          {mainSteps.map((step, index) => {
            const done = allDone || index < displayIndex;
            const active = !allDone && index === displayIndex;
            const pending = !allDone && index > displayIndex;
            const showDetail = Boolean(step.detail) && (done || active);
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
                  {showDetail ? (
                    <span className={`${styles.detail} ${done ? styles.detailDone : ''}`}>
                      {step.detail}
                    </span>
                  ) : null}
                </span>
              </li>
            );
          })}

          {inDashboardPhase ? (
            <li
              className={`${styles.row} ${dashboardDone ? styles.done : ''} ${dashboardActive ? styles.active : ''}`}
            >
              <span className={styles.icon} aria-hidden>
                {dashboardDone ? '✓' : dashboardActive ? '●' : '○'}
              </span>
              <span className={styles.messageWrap}>
                <span className={styles.message}>Preparing your dashboard</span>
                {dashboardDetail ? (
                  <span className={styles.detail}>{dashboardDetail}</span>
                ) : null}
              </span>
            </li>
          ) : null}

          {allDone ? (
            <li className={`${styles.row} ${styles.done}`}>
              <span className={styles.icon} aria-hidden>✓</span>
              <span className={styles.messageWrap}>
                <span className={styles.message}>Opening your dashboard…</span>
              </span>
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
