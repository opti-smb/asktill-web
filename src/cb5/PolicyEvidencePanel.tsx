import { useEffect, useState } from 'react';

import { getPolicyProof, markEvidenceReviewed, resolvePolicyProof } from './api';
import { useEvidenceOutlet } from './EvidenceWorkspace';
import styles from './cb5.module.css';
import type { PolicyProof } from './types';

export default function PolicyEvidencePanel() {
  const { caseId, packet, reload } = useEvidenceOutlet();
  const [data, setData] = useState<PolicyProof | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    void getPolicyProof(caseId)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load policy.'));
  }, [caseId, packet?.id]);

  return (
    <section className={styles.card}>
      <div className={styles.cardTitle}>Policy at purchase</div>
      {!data?.historical_available ? (
        <div className={`${styles.banner} ${styles.bannerBlock}`}>
          Historical policy not available. Today’s webpage is not used as purchase-time proof.
        </div>
      ) : null}
      {data?.historical_available && (data.missing_acceptance || !data.accepted_at) ? (
        <div className={`${styles.banner} ${styles.bannerWarn}`}>Missing acceptance proof. accepted_at stays empty.</div>
      ) : null}
      {error ? <p className={styles.error}>{error}</p> : null}
      <table className={styles.table}>
        <tbody>
          <tr>
            <th>Transaction date</th>
            <td>{data?.transaction_date || '—'}</td>
          </tr>
          <tr>
            <th>Policy type</th>
            <td>{data?.policy_type || '—'}</td>
          </tr>
          <tr>
            <th>Historical version</th>
            <td>{data?.version ?? '—'}</td>
          </tr>
          <tr>
            <th>Effective range</th>
            <td>
              {data?.effective_from || '—'} → {data?.effective_to || 'open'}
            </td>
          </tr>
          <tr>
            <th>Source URL</th>
            <td>{data?.source_url || '—'}</td>
          </tr>
          <tr>
            <th>Content hash</th>
            <td>{data?.content_hash || '—'}</td>
          </tr>
          <tr>
            <th>Acceptance timestamp</th>
            <td>{data?.accepted_at || 'Missing'}</td>
          </tr>
          <tr>
            <th>Acceptance method</th>
            <td>{data?.acceptance_method || '—'}</td>
          </tr>
          <tr>
            <th>Source event ID</th>
            <td>{data?.source_event_id || '—'}</td>
          </tr>
        </tbody>
      </table>
      {showText && data?.text ? <pre className={styles.meta}>{data.text}</pre> : null}
      <div className={styles.row}>
        <button type="button" className={styles.secondary} disabled={!data?.historical_available} onClick={() => setShowText(true)}>
          View Historical Policy
        </button>
        <button type="button" className={styles.secondary} disabled={!data?.accepted_at}>
          View Acceptance
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={async () => {
            try {
              setData(await resolvePolicyProof(caseId));
              await reload();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Resolve failed.');
            }
          }}
        >
          Resolve
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
