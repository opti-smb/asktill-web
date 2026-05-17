import SectionHeader from '../components/layout/SectionHeader';
import KPICard from '../components/common/KPICard';
import StandardQuestions from '../components/analysis/StandardQuestions';
import ProcessorCard from '../components/analysis/ProcessorCard';
import QuestionPicker from '../components/analysis/QuestionPicker';
import { kpis } from '../data/kpis';
import styles from './AnalysisPage.module.css';

export default function AnalysisPage() {
  return (
    <>
      <SectionHeader
        periodMeta="MARCH 2026 vs FEBRUARY 2026"
        title={<>How the till <em>looked last month.</em></>}
      />

      <div className={styles.main}>
        <div className="wrap">
          {/* KPI Band */}
          <div className={styles.kpiBand}>
            {kpis.map((kpi) => (
              <KPICard key={kpi.label} kpi={kpi} />
            ))}
          </div>

          {/* Standard Questions */}
          <div className={styles.sectionHead}>
            <div className={styles.sectionH}>Three things <em>everyone needs to know.</em></div>
            <div className={styles.sectionSub}>Always shown · updated daily</div>
          </div>
          <StandardQuestions />

          {/* Processor Diagnostics */}
          <div className={styles.sectionHead}>
            <div className={styles.sectionH}>Where your money <em>actually goes.</em></div>
            <div className={styles.sectionSub}>Commission &amp; timing across processors</div>
          </div>

          <div className={styles.processorGrid}>
            <ProcessorCard
              iconType="pos"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <path d="M8 21h8M12 17v4" />
                </svg>
              }
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
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
                </svg>
              }
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

          {/* Picker */}
          <div className={styles.sectionHead}>
            <div className={styles.sectionH}>Pick two to <em>explore deeper.</em></div>
            <div className={styles.sectionSub}>Tap to expand · AskTill will pull the answer</div>
          </div>
          <QuestionPicker />
        </div>
      </div>
    </>
  );
}
