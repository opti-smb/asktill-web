import { useCallback, useEffect, useState } from 'react';

import { getOrderProof, markEvidenceReviewed, refreshOrderProof } from './api';
import { useEvidenceOutlet } from './EvidenceWorkspace';
import styles from './cb5.module.css';
import type { OrderProof } from './types';

export default function OrderProofPanel() {
  const { caseId, packet, reload } = useEvidenceOutlet();
  const [data, setData] = useState<OrderProof | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await getOrderProof(caseId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load order proof.');
    }
  }, [caseId]);

  useEffect(() => {
    void load();
  }, [load, packet?.id]);

  return (
    <section className={styles.card}>
      <div className={styles.cardTitle}>Order / receipt proof</div>
      {data && data.reconciled === false ? (
        <div className={`${styles.banner} ${styles.bannerBlock}`}>
          Amount/currency does not reconcile ({data.mismatch || data.reconciliation}). This is not labeled reconciled.
        </div>
      ) : null}
      {error ? <p className={styles.error}>{error}</p> : null}
      <table className={styles.table}>
        <tbody>
          <tr>
            <th>Disputed amount</th>
            <td>{data?.disputed_amount_minor ?? '—'}</td>
          </tr>
          <tr>
            <th>Shopify / order number</th>
            <td>{data?.order_number || '—'}</td>
          </tr>
          <tr>
            <th>Order date</th>
            <td>{data?.order_created_at || '—'}</td>
          </tr>
          <tr>
            <th>Order total</th>
            <td>
              {data?.gross_amount_minor ?? '—'} {data?.currency}
            </td>
          </tr>
          <tr>
            <th>Reconciliation</th>
            <td>{data?.reconciliation || '—'}</td>
          </tr>
          <tr>
            <th>Customer identity</th>
            <td>
              {data?.customer_name || data?.customer_email
                ? `${data.customer_name || ''} ${data.customer_email || ''}`.trim()
                : 'Omitted'}
            </td>
          </tr>
          <tr>
            <th>Receipt</th>
            <td>
              {data?.receipt_url ? (
                <a href={data.receipt_url} target="_blank" rel="noreferrer">
                  Available
                </a>
              ) : (
                'Missing'
              )}
            </td>
          </tr>
          <tr>
            <th>Source object</th>
            <td>
              {data?.source_system} {data?.source_order_id}
            </td>
          </tr>
          <tr>
            <th>Fetched / extractor</th>
            <td>
              {data?.fetched_at || '—'} · {data?.extractor_version || '—'}
            </td>
          </tr>
        </tbody>
      </table>
      <div className={styles.meta}>Items: {(data?.line_items || []).map((item) => `${item.title} ×${item.quantity}`).join(', ') || '—'}</div>
      <div className={styles.row}>
        <button
          type="button"
          className={styles.button}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              setData(await refreshOrderProof(caseId));
              await reload();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Refresh failed.');
            } finally {
              setBusy(false);
            }
          }}
        >
          Refresh
        </button>
        {data?.receipt_url ? (
          <a className={styles.secondary} href={data.receipt_url} target="_blank" rel="noreferrer">
            View Source
          </a>
        ) : (
          <button type="button" className={styles.secondary} disabled>
            View Source
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
