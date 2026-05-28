import SectionHeader from '../components/layout/SectionHeader';
import ForecastChart from '../components/cashflow/ForecastChart';
import InflowOutflow from '../components/cashflow/InflowOutflow';
import { useAnalysis } from '../context/AnalysisContext';
import { getAnalyzeAnalysis } from '../lib/analyzeResponse';
import styles from './CashFlowPage.module.css';

export default function CashFlowPage() {
  const { result } = useAnalysis();
  const analysis = getAnalyzeAnalysis(result);
  const cashFlow = analysis?.cash_flow ?? null;

  return (
    <>
      <SectionHeader
        periodMeta={analysis?.period_label ?? 'CASH FLOW'}
        title={<>Where the money <em>came and went.</em></>}
      />
      <div className={styles.main}>
        <div className="wrap">
          <ForecastChart cashFlow={cashFlow} />
          <InflowOutflow cashFlow={cashFlow} />
        </div>
      </div>
    </>
  );
}
