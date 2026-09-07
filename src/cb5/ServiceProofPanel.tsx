import { useEffect, useState } from 'react';

import { getServiceProof, markEvidenceReviewed, refreshServiceProof } from './api';
import { useEvidenceOutlet } from './EvidenceWorkspace';
import styles from './cb5.module.css';
import type { ServiceProof } from './types';

export default function ServiceProofPanel() {
  const { caseId, packet, reload } = useEvidenceOutlet();
  const [data, setData] = useState<ServiceProof | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getServiceProof(caseId)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load service proof.'));
  }, [caseId, packet?.id]);

  if (data?.hidden || packet?.tabs.service === false) {
    return <section className={styles.card}>Service proof is hidden for physical-only cases.</section>;
  }

  return (
    <section className={styles.card}>
      <div className={styles.cardTitle}>Digital / service proof</div>
      {data?.forced_review ? (
        <div className={`${styles.banner} ${styles.bannerBlock}`}>
          Forced review: {data.forced_review_reason || 'retention or legal metadata missing'}
        </div>
      ) : null}
      {error ? <p className={styles.error}>{error}</p> : null}
      <table className={styles.table}>
        <tbody>
          <tr>
            <th>Customer ref matched</th>
            <td>{data?.customer_ref_matched ? 'Yes' : 'No'}</td>
          </tr>
          <tr>
            <th>Order ref matched</th>
            <td>{data?.order_ref_matched ? 'Yes' : 'No'}</td>
          </tr>
          <tr>
            <th>Collection basis</th>
            <td>{data?.collection_basis || '—'}</td>
          </tr>
          <tr>
            <th>Retention policy</th>
            <td>{data?.retention_policy_version || 'Missing'}</td>
          </tr>
        </tbody>
      </table>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>When</th>
            <th>Type</th>
            <th>IP (masked)</th>
            <th>Device (masked)</th>
          </tr>
        </thead>
        <tbody>
          {(data?.events || []).map((event) => (
            <tr key={event.event_id}>
              <td>{event.occurred_at}</td>
              <td>{event.event_type}</td>
              <td>{event.ip_address || '—'}</td>
              <td>{event.device_id || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={styles.row}>
        <button
          type="button"
          className={styles.button}
          onClick={async () => {
            try {
              setData(await refreshServiceProof(caseId));
              await reload();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Refresh failed.');
            }
          }}
        >
          Refresh Events
        </button>
        <button type="button" className={styles.secondary} disabled>
          View Source Events
        </button>
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
