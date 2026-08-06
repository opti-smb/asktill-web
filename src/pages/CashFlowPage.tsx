import { Link } from 'react-router-dom';
import ForecastChart from '../components/cashflow/ForecastChart';
import InflowOutflow from '../components/cashflow/InflowOutflow';
import CashFlowKpis from '../components/cashflow/CashFlowKpis';
import CashFlowInsights from '../components/cashflow/CashFlowInsights';
import DashboardEmptyState from '../components/dashboard/DashboardEmptyState';
import { useAnalysis } from '../context/AnalysisContext';
import { useHasLiveDashboardAnalysis, useReportSync } from '../hooks/useReportSync';
import { getAnalyzeAnalysis } from '../lib/analyzeResponse';
import styles from './CashFlowPage.module.css';
import headerStyles from '../components/layout/SectionHeader.module.css';

const cashWidthStyle = {
  width: 'calc(100vw - var(--sidebar-width, 220px))',
  maxWidth: 'none',
} as const;

export default function CashFlowPage() {
  const { result } = useAnalysis();
  const { historyReady } = useReportSync();
  const hasLiveAnalysis = useHasLiveDashboardAnalysis(result);
  const analysis = getAnalyzeAnalysis(result);
  const cashFlow = analysis?.cash_flow ?? null;
  const periodLabel = analysis?.period_label?.trim() || 'CASH FLOW';

  if (!hasLiveAnalysis) {
    return (
      <div className={styles.cashPage} style={cashWidthStyle}>
        <div className={styles.main}>
          <div className={styles.fullWrap}>
            <DashboardEmptyState historyReady={historyReady} loadingHintClassName={styles.emptyHint} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.cashPage} style={cashWidthStyle}>
      <div className={styles.main}>
        <div className={styles.fullWrap}>
          <div className={styles.titleChrome}>
            <div className={headerStyles.headerRow}>
              <div>
                <div className={headerStyles.periodMeta}>{periodLabel}</div>
                <h1 className={headerStyles.h1}>
                  Cash Flow. <span className={styles.titleAccent}>Know what&apos;s coming.</span>
                </h1>
                <p className={styles.lede}>
                  Forecast, inflows, outflows, and cash balance for the next 30 days.
                </p>
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
            <CashFlowKpis cashFlow={cashFlow} result={result} kpis={analysis?.kpis} />
            <ForecastChart cashFlow={cashFlow} result={result} />
            <InflowOutflow cashFlow={cashFlow} result={result} />
            <CashFlowInsights cashFlow={cashFlow} result={result} />
          </div>
        </div>
      </div>
    </div>
  );
}
