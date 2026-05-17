import SectionHeader from '../components/layout/SectionHeader';
import ForecastChart from '../components/cashflow/ForecastChart';
import InflowOutflow from '../components/cashflow/InflowOutflow';
import styles from './CashFlowPage.module.css';

export default function CashFlowPage() {
  return (
    <>
      <SectionHeader
        periodMeta="CASH FLOW · MARCH 2026"
        title={<>Where the money <em>came and went.</em></>}
      />
      <div className={styles.main}>
        <div className="wrap">
          <ForecastChart />
          <InflowOutflow />
        </div>
      </div>
    </>
  );
}
