import { Link } from 'react-router-dom';
import ReconSummary from '../components/recon/ReconSummary';
import FlaggedTable from '../components/recon/FlaggedTable';
import DashboardEmptyState from '../components/dashboard/DashboardEmptyState';
import { useAnalysis } from '../context/AnalysisContext';
import { useHasLiveDashboardAnalysis, useReportSync } from '../hooks/useReportSync';
import { getAnalyzeAnalysis } from '../lib/analyzeResponse';
import styles from './ReconPage.module.css';
import headerStyles from '../components/layout/SectionHeader.module.css';

const reconWidthStyle = {
  width: 'calc(100vw - var(--sidebar-width, 220px))',
  maxWidth: 'none',
} as const;

export default function ReconPage() {
  const { result } = useAnalysis();
  const { historyReady } = useReportSync();
  const hasLiveAnalysis = useHasLiveDashboardAnalysis(result);
  const analysis = getAnalyzeAnalysis(result);
  const reconciliation = analysis?.reconciliation ?? null;
  const periodLabel = analysis?.period_label?.trim() || 'RECONCILIATION';

  if (!hasLiveAnalysis) {
    return (
      <div className={styles.reconPage} style={reconWidthStyle}>
        <div className={styles.main}>
          <div className={styles.fullWrap}>
            <DashboardEmptyState historyReady={historyReady} loadingHintClassName={styles.emptyHint} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.reconPage} style={reconWidthStyle}>
      <div className={styles.main}>
        <div className={styles.fullWrap}>
          <div className={styles.titleChrome}>
            <div className={headerStyles.headerRow}>
              <div>
                <div className={headerStyles.periodMeta}>{periodLabel}</div>
                <h1 className={headerStyles.h1}>
                  Every dollar, <em>traced.</em>
                </h1>
              </div>
              <div className={styles.headerActions}>
                <Link to="/onboarding" className={styles.uploadBtn}>
                  <i className="ti ti-upload" aria-hidden />
                  Upload statement
                </Link>
                <span className={styles.periodChip}>
                  <i className="ti ti-calendar" aria-hidden />
                  {periodLabel}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.scrollViewport}>
            <ReconSummary reconciliation={reconciliation} />
            <FlaggedTable reconciliation={reconciliation} />
          </div>
        </div>
      </div>
    </div>
  );
}
