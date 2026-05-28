import SectionHeader from '../components/layout/SectionHeader';
import KPICard from '../components/common/KPICard';
import StandardQuestions from '../components/analysis/StandardQuestions';
import ProcessorCard from '../components/analysis/ProcessorCard';
import QuestionPicker from '../components/analysis/QuestionPicker';
import { useAnalysis } from '../context/AnalysisContext';
import { mapApiKpisToUi, mapApiProcessors } from '../lib/formatAnalysis';
import { getAnalyzeAnalysis } from '../lib/analyzeResponse';
import { kpis as mockKpis } from '../data/kpis';
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

function MockProcessorGrid() {
  return (
    <div className={styles.processorGrid}>
      <ProcessorCard
        iconType="pos"
        icon={<PosIcon />}
        title="Square POS"
        subtitle="$45,820 processed · 1,847 transactions"
        stat1Label="Avg commission"
        stat1Value="2.72%"
        stat1Range="Min 2.4% · Max 3.5%"
        stat1Delta="▲ 0.08% vs Feb"
        stat1DeltaType="up-bad"
        stat2Label="Avg days to pay"
        stat2Value="1.2 days"
        stat2Range="Min 1 day · Max 3 days"
        stat2Delta="— same as Feb"
        stat2DeltaType="flat"
        compRows={[
          { label: 'This mo', width: '87%', fill: 'var(--brand)', value: '2.72%' },
          { label: 'Feb', width: '84%', fill: 'var(--rule)', value: '2.64%' },
          { label: '3mo avg', width: '82%', fill: '#94A3B8', value: '2.59%' },
          { label: 'Peers', width: '77%', fill: 'var(--pos-soft)', value: '2.41%', valueColor: 'var(--pos)' },
        ]}
      />
      <ProcessorCard
        iconType="ecomm"
        icon={<EcommIcon />}
        title="Stripe (Shopify)"
        subtitle="$12,414 processed · 172 orders"
        stat1Label="Avg commission"
        stat1Value="3.18%"
        stat1Range="Min 2.9% · Max 3.6%"
        stat1Delta="▼ 0.04% vs Feb"
        stat1DeltaType="down-good"
        stat2Label="Avg days to pay"
        stat2Value="2.3 days"
        stat2Range="Min 2 days · Max 5 days"
        stat2Delta="▼ 0.4 days vs Feb"
        stat2DeltaType="down-good"
        compRows={[
          { label: 'This mo', width: '80%', fill: 'var(--orange)', value: '3.18%' },
          { label: 'Feb', width: '81%', fill: 'var(--rule)', value: '3.22%' },
          { label: '3mo avg', width: '80%', fill: '#94A3B8', value: '3.19%' },
          { label: 'Peers', width: '75%', fill: 'var(--pos-soft)', value: '2.98%', valueColor: 'var(--pos)' },
        ]}
      />
    </div>
  );
}

export default function AnalysisPage() {
  const { result } = useAnalysis();
  const analysis = getAnalyzeAnalysis(result);
  const apiKpis = mapApiKpisToUi(analysis?.kpis);
  const kpisToShow = apiKpis.length > 0 ? apiKpis : mockKpis;
  const processors = mapApiProcessors(analysis?.processors);
  const insights = analysis?.standard_insights;

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
            {kpisToShow.map((kpi) => (
              <KPICard key={kpi.label} kpi={kpi} />
            ))}
          </div>

          <div className={styles.sectionHead}>
            <div className={styles.sectionH}>
              Three things <em>everyone needs to know.</em>
            </div>
            <div className={styles.sectionSub}>Always shown · updated daily</div>
          </div>
          <StandardQuestions insights={insights} />

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
          ) : (
            <MockProcessorGrid />
          )}

          <div className={styles.sectionHead}>
            <div className={styles.sectionH}>
              Pick two to <em>explore deeper.</em>
            </div>
            <div className={styles.sectionSub}>Tap to expand · AskTill will pull the answer</div>
          </div>
          <QuestionPicker />
        </div>
      </div>
    </>
  );
}
