import { useEffect, useState } from 'react';

import { getDeliveryProof, markEvidenceReviewed, refreshDeliveryProof } from './api';
import { useEvidenceOutlet } from './EvidenceWorkspace';
import styles from './cb5.module.css';
import type { DeliveryProof } from './types';

export default function DeliveryProofPanel() {
  const { caseId, packet, reload } = useEvidenceOutlet();
  const [data, setData] = useState<DeliveryProof | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getDeliveryProof(caseId)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load delivery.'));
  }, [caseId, packet?.id]);

  if (packet && packet.tabs.delivery === false) {
    return <section className={styles.card}>Delivery is not applicable for this product type.</section>;
  }

  return (
    <section className={styles.card}>
      <div className={styles.cardTitle}>Physical delivery proof</div>
      {data?.delivery_unverified ? (
        <div className={`${styles.banner} ${styles.bannerBlock}`}>
          Delivery unverified. Tracking is not proof of delivery.
        </div>
      ) : null}
      {error ? <p className={styles.error}>{error}</p> : null}
      <table className={styles.table}>
        <tbody>
          <tr>
            <th>Carrier</th>
            <td>{data?.carrier || '—'}</td>
          </tr>
          <tr>
            <th>Tracking number</th>
            <td>{data?.tracking_number || '—'}</td>
          </tr>
          <tr>
            <th>Shipped at</th>
            <td>{data?.shipped_at || '—'}</td>
          </tr>
          <tr>
            <th>Carrier status</th>
            <td>{data?.delivery_status || '—'}</td>
          </tr>
          <tr>
            <th>Delivered at</th>
            <td>{data?.delivered_at || '—'}</td>
          </tr>
          <tr>
            <th>Signed delivery</th>
            <td>{data?.signed_delivery_available ? 'Available' : 'No'}</td>
          </tr>
          <tr>
            <th>Address matches order</th>
            <td>{data?.address_matches_order == null ? '—' : data.address_matches_order ? 'Yes' : 'No'}</td>
          </tr>
          <tr>
            <th>Shopify fulfillment source</th>
            <td>{data?.source_fulfillment_id || '—'}</td>
          </tr>
          <tr>
            <th>Carrier proof source</th>
            <td>{data?.proof_source_id || '—'}</td>
          </tr>
        </tbody>
      </table>
      <div className={styles.row}>
        <button
          type="button"
          className={styles.button}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              setData(await refreshDeliveryProof(caseId));
              await reload();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Refresh failed.');
            } finally {
              setBusy(false);
            }
          }}
        >
          Refresh Tracking
        </button>
        {data?.tracking_url ? (
          <a className={styles.secondary} href={data.tracking_url} target="_blank" rel="noreferrer">
            View Carrier Proof
          </a>
        ) : (
          <button type="button" className={styles.secondary} disabled>
            View Carrier Proof
          </button>
        )}
        <button
          type="button"
          className={styles.secondary}
          onClick={async () => {
            await markEvidenceReviewed(caseId);
            await reload();
          }}
        >
          Mark Reviewed
        </button>
      </div>
    </section>
  );
}
