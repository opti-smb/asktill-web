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
        <h1 className={headerStyles.h1}>Decision settings</h1>
        <p className={cb4.lead}>
          Merchant thresholds for recommendations and maker-checker. Saving creates a new version.
        </p>
        <MerchantDecisionSettings />
      </div>
    </div>
  );
}
