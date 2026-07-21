import { ChannelPartnersApp } from '@asktill/channel-partners';
import SectionHeader from '../components/layout/SectionHeader';

import styles from './ChannelPartnersPage.module.css';

/** Dashboard Channel partners tab — embeds @asktill/channel-partners marketplace UI. */
export default function ChannelPartnersPage() {
  return (
    <>
      <SectionHeader
        periodMeta="CHANNEL PARTNERS"
        title={
          <>
            Grow with <em>Asktill.</em>
          </>
        }
      />
      <div className={styles.main}>
        <div className="wrap">
          <div className={styles.card}>
            <div className={styles.scrollViewport}>
              <ChannelPartnersApp />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
