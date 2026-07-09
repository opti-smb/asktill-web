import SectionHeader from '../components/layout/SectionHeader';
import ReconSummary from '../components/recon/ReconSummary';
import FlaggedTable from '../components/recon/FlaggedTable';
import DashboardEmptyState from '../components/dashboard/DashboardEmptyState';
import { useAnalysis } from '../context/AnalysisContext';
import { useHasLiveDashboardAnalysis, useReportSync } from '../hooks/useReportSync';
import { getAnalyzeAnalysis } from '../lib/analyzeResponse';
import styles from './ReconPage.module.css';

export default function ReconPage() {
  const { result } = useAnalysis();
  const { historyReady } = useReportSync();
  const hasLiveAnalysis = useHasLiveDashboardAnalysis(result);
  const analysis = getAnalyzeAnalysis(result);
  const reconciliation = analysis?.reconciliation ?? null;

  if (!hasLiveAnalysis) {
    return (
      <div className={styles.main}>
        <DashboardEmptyState historyReady={historyReady} loadingHintClassName={styles.emptyHint} />
      </div>
    );
  }

  return (
    <>
      <SectionHeader
        periodMeta={analysis?.period_label ?? 'RECONCILIATION'}
        title={<>Every dollar, <em>traced.</em></>}
      />
      <div className={styles.main}>
        <div className="wrap">
          <div className={styles.card}>
            <div className={styles.scrollViewport}>
              <ReconSummary reconciliation={reconciliation} />
              <FlaggedTable reconciliation={reconciliation} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
