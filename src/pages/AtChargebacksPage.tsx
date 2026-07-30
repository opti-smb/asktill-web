import { ChargebacksApp } from '@asktill/chargebacks';
import { useAuth } from '../context/AuthContext';
import SectionHeader from '../components/layout/SectionHeader';

import styles from './AtChargebacksPage.module.css';

/** Dashboard AT Chargebacks tab — embeds @asktill/chargebacks overview. */
export default function AtChargebacksPage() {
  const { user } = useAuth();
  const name = user?.name?.trim() || user?.businessName?.trim() || null;

  return (
    <>
      <SectionHeader
        periodMeta="AT CHARGEBACKS"
        title={
          <>
            Dispute <em>protection.</em>
          </>
        }
      />
      <div className={styles.main}>
        <div className="wrap">
          <div className={styles.page}>
            <div className={styles.scrollViewport}>
              <ChargebacksApp userName={name} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
