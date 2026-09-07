import { Link } from 'react-router-dom';
import MerchantDecisionSettings from '../components/cb4/MerchantDecisionSettings';
import cb4 from './Cb4Pages.module.css';
import headerStyles from '../components/layout/SectionHeader.module.css';

export default function Cb4SettingsPage() {
  return (
    <div className={cb4.page}>
      <div className={cb4.main}>
        <Link to="/dashboard/chargebacks" className={cb4.back}>
          ← Money Reclaimed
        </Link>
        <h1 className={headerStyles.h1}>Chargeback Controls</h1>
        <p className={cb4.lead}>
          Merchant thresholds for recommendations and maker-checker. Saving creates a new version.
        </p>
        <p className={cb4.meta} style={{ marginBottom: 14 }}>
          <Link to="/dashboard/chargebacks/settings/evidence-matrix" className={cb4.policiesLink}>
            Evidence Matrix
          </Link>
        </p>
        <MerchantDecisionSettings />
      </div>
    </div>
  );
}
