import SectionHeader from '../components/layout/SectionHeader';
import ReconSummary from '../components/recon/ReconSummary';
import FlaggedTable from '../components/recon/FlaggedTable';
import styles from './ReconPage.module.css';

export default function ReconPage() {
  return (
    <>
      <SectionHeader
        periodMeta="RECONCILIATION · MARCH 2026"
        title={<>Every dollar, <em>traced.</em></>}
      />
      <div className={styles.main}>
        <div className="wrap">
          <ReconSummary />
          <FlaggedTable />
        </div>
      </div>
    </>
  );
}
