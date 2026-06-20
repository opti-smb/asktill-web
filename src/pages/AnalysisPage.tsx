import SectionHeader from '../components/layout/SectionHeader';
import KPICard from '../components/common/KPICard';
import StandardQuestions from '../components/analysis/StandardQuestions';
import ProcessorCard from '../components/analysis/ProcessorCard';
import DashboardEmptyState from '../components/dashboard/DashboardEmptyState';
import { useAnalysis } from '../context/AnalysisContext';
import { useHasLiveDashboardAnalysis, useReportSync } from '../hooks/useReportSync';
import { mapApiKpisToUi, mapApiProcessors } from '../lib/formatAnalysis';
import { getAnalyzeAnalysis } from '../lib/analyzeResponse';
import styles from './AnalysisPage.module.css';

function PosIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

function EcommIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
    </svg>
  );
}

export default function AnalysisPage() {
  const { result } = useAnalysis();
  const { historyReady } = useReportSync();
  const hasLiveAnalysis = useHasLiveDashboardAnalysis(result);
  const analysis = getAnalyzeAnalysis(result);
  const apiKpis = mapApiKpisToUi(analysis?.kpis, result);
  const processors = mapApiProcessors(analysis?.processors);
  const insights = analysis?.standard_insights;

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
        periodMeta={analysis?.period_label ?? 'MARCH 2026 vs FEBRUARY 2026'}
        title={
          analysis?.title ? (
            <>{analysis.title}</>
          ) : (
            <>
              How the till <em>looked last month.</em>
            </>
          )
        }
      />

      <div className={styles.main}>
        <div className="wrap">
          <div className={styles.kpiBand}>
            {apiKpis.map((kpi) => (
              <KPICard key={kpi.label} kpi={kpi} />
            ))}
          </div>

          <div className={styles.sectionHead}>
            <div className={styles.sectionH}>
              Three things <em>everyone needs to know.</em>
            </div>
            <div className={styles.sectionSub}>Always shown · updated daily</div>
          </div>
          <StandardQuestions insights={insights} hasLiveAnalysis={hasLiveAnalysis} />

          <div className={styles.sectionHead}>
            <div className={styles.sectionH}>
              Where your money <em>actually goes.</em>
            </div>
            <div className={styles.sectionSub}>Commission &amp; timing across processors</div>
          </div>

          {processors.length > 0 ? (
            <div className={styles.processorGrid}>
              {processors.map((p) => (
                <ProcessorCard
                  key={p.title}
                  iconType={p.iconType}
                  icon={p.iconType === 'ecomm' ? <EcommIcon /> : <PosIcon />}
                  title={p.title}
                  subtitle={p.subtitle}
                  stat1Label={p.stat1Label}
                  stat1Value={p.stat1Value}
                  stat1Range={p.stat1Range}
                  stat1Delta={p.stat1Delta}
                  stat1DeltaType={p.stat1DeltaType}
                  stat2Label={p.stat2Label}
                  stat2Value={p.stat2Value}
                  stat2Range={p.stat2Range}
                  stat2Delta={p.stat2Delta}
                  stat2DeltaType={p.stat2DeltaType}
                  compRows={p.compRows}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
