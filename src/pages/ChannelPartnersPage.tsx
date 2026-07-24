import { useCallback, useState } from 'react';
import { ChannelPartnersApp, type TaxAdvisor } from '@asktill/channel-partners';

import BookConsultationModal from '../components/partners/BookConsultationModal';
import SectionHeader from '../components/layout/SectionHeader';

import styles from './ChannelPartnersPage.module.css';

/** Dashboard Channel partners tab — embeds @asktill/channel-partners marketplace UI. */
export default function ChannelPartnersPage() {
  const [bookingAdvisor, setBookingAdvisor] = useState<TaxAdvisor | null>(null);

  const onBookAdvisor = useCallback((advisor: TaxAdvisor) => {
    setBookingAdvisor(advisor);
  }, []);

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
              <ChannelPartnersApp onBookAdvisor={onBookAdvisor} />
            </div>
          </div>
        </div>
      </div>

      <BookConsultationModal
        open={Boolean(bookingAdvisor)}
        advisor={bookingAdvisor}
        onClose={() => setBookingAdvisor(null)}
      />
    </>
  );
}
