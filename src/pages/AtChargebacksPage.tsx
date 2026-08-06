import { ChargebacksApp } from '@asktill/chargebacks';
import { useAuth } from '../context/AuthContext';
import styles from './AtChargebacksPage.module.css';
import headerStyles from '../components/layout/SectionHeader.module.css';

const wideStyle = {
  width: 'calc(100vw - var(--sidebar-width, 220px))',
  maxWidth: 'none',
} as const;

/** Dashboard Money Reclaimed — Dispute protection overview. */
export default function AtChargebacksPage() {
  const { user } = useAuth();
  const name = user?.name?.trim() || user?.businessName?.trim() || null;

  return (
    <div className={styles.chargePage} style={wideStyle}>
      <div className={styles.main}>
        <div className={styles.fullWrap}>
          <div className={styles.titleChrome}>
            <div className={headerStyles.headerRow}>
              <div>
                <div className={styles.periodMeta}>AT CHARGEBACKS</div>
                <h1 className={headerStyles.h1}>
                  <span className={styles.titleAccent}>Money reclaimed.</span>
                </h1>
              </div>
            </div>
          </div>
          <div className={styles.scrollViewport}>
            <ChargebacksApp userName={name} />
          </div>
        </div>
      </div>
    </div>
  );
}
