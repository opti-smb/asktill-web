import SectionHeader from '../components/layout/SectionHeader';
import ForecastChart from '../components/cashflow/ForecastChart';
import InflowOutflow from '../components/cashflow/InflowOutflow';
import DashboardEmptyState from '../components/dashboard/DashboardEmptyState';
import { useAnalysis } from '../context/AnalysisContext';
import { useHasLiveDashboardAnalysis, useReportSync } from '../hooks/useReportSync';
import { getAnalyzeAnalysis } from '../lib/analyzeResponse';
import styles from './CashFlowPage.module.css';

export default function CashFlowPage() {
  const { result } = useAnalysis();
  const { historyReady } = useReportSync();
  const hasLiveAnalysis = useHasLiveDashboardAnalysis(result);
  const analysis = getAnalyzeAnalysis(result);
  const cashFlow = analysis?.cash_flow ?? null;

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
        periodMeta={analysis?.period_label ?? 'CASH FLOW'}
        title={<>Where the money <em>came and went.</em></>}
      />
      <div className={styles.main}>
        <div className="wrap">
          <ForecastChart cashFlow={cashFlow} result={result} />
          <InflowOutflow cashFlow={cashFlow} result={result} />
        </div>
      </div>
    </>
  );
}
