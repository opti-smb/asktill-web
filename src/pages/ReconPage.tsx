import SectionHeader from '../components/layout/SectionHeader';
import ReconSummary from '../components/recon/ReconSummary';
import FlaggedTable from '../components/recon/FlaggedTable';
import { useAnalysis } from '../context/AnalysisContext';
import { getAnalyzeAnalysis } from '../lib/analyzeResponse';
import styles from './ReconPage.module.css';

export default function ReconPage() {
  const { result } = useAnalysis();
  const analysis = getAnalyzeAnalysis(result);
  const reconciliation = analysis?.reconciliation ?? null;

  return (
    <>
      <SectionHeader
        periodMeta={analysis?.period_label ?? 'RECONCILIATION'}
        title={<>Every dollar, <em>traced.</em></>}
      />
      <div className={styles.main}>
        <div className="wrap">
          <ReconSummary reconciliation={reconciliation} />
          <FlaggedTable reconciliation={reconciliation} />
        </div>
      </div>
    </>
  );
}
