import { useState } from 'react';
import { Link } from 'react-router-dom';

import { buildEvidencePacket } from './api';
import { useEvidenceOutlet } from './EvidenceWorkspace';
import styles from './cb5.module.css';
import type { ProductType } from './types';

const LATER = ['Communications', 'Stripe Mapping', 'Contradiction Checks', 'File Controls', 'Narrative', 'Review/Lock'];

function tone(status?: string | null): string {
  const key = (status || '').toLowerCase();
  if (key === 'found' || key === 'reconciled' || key === 'complete' || key === 'delivered') return styles.ok;
  if (key === 'missing' || key === 'incomplete' || key === 'unverified') return styles.bad;
  return styles.na;
}

export default function EvidencePacketOverview() {
  const { caseId, row, packet, loading, reload } = useEvidenceOutlet();
  const [productType, setProductType] = useState<ProductType>('physical');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reason = (row?.reason || packet?.reason || '').toLowerCase();
  const defaultType: ProductType =
    packet?.product_type === 'digital' || reason === 'fraudulent' ? 'digital' : 'physical';

  async function refresh() {
    setBusy(true);
    setError(null);
    try {
      await buildEvidencePacket(caseId, packet?.product_type || productType || defaultType, 'FIGHT');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not refresh evidence.');
    } finally {
      setBusy(false);
    }
  }

  if (loading && !packet) {
    return <div className={styles.card}>Loading evidence packet…</div>;
  }

  return (
    <div>
      {packet && !packet.continue_allowed ? (
        <div className={`${styles.banner} ${styles.bannerBlock}`}>
          Required evidence is incomplete ({packet.readiness.required_found}/{packet.readiness.required_total}).
          Continue stays blocked until required CB5-01 to CB5-06 items are found.
        </div>
      ) : null}
      {packet?.continue_allowed ? (
        <div className={`${styles.banner} ${styles.bannerOk}`}>
          Required evidence is assembled. Later CB6 submission steps stay disabled here.
        </div>
      ) : null}
      {!packet ? (
        <section className={styles.card}>
          <div className={styles.cardTitle}>Build evidence packet</div>
          <p className={styles.meta}>FIGHT or Manual Review only. Accept does not get a packet.</p>
          <label className={styles.meta} htmlFor="productType">
            Product type
          </label>
          <select
            id="productType"
            className={styles.select}
            value={productType || defaultType}
            onChange={(event) => setProductType(event.target.value as ProductType)}
          >
            <option value="physical">physical</option>
            <option value="digital">digital</option>
            <option value="service">service</option>
            <option value="subscription">subscription</option>
          </select>
          <div className={styles.row}>
            <button type="button" className={styles.button} disabled={busy} onClick={() => void refresh()}>
              {busy ? 'Building…' : 'Refresh Evidence'}
            </button>
          </div>
        </section>
      ) : (
        <section className={styles.card}>
          <div className={styles.cardTitle}>Evidence packet overview</div>
          <p className={styles.meta}>
            Version {packet.packet_version} · case {packet.case_id} · {packet.reason.replace(/_/g, ' ')} ·{' '}
            {packet.product_type} · template v{packet.evidence_template_version ?? '—'}
          </p>
          <table className={styles.table}>
            <tbody>
              <tr>
                <th>Source lineage</th>
                <td className={tone(packet.lineage_status)}>{packet.lineage_status}</td>
              </tr>
              <tr>
                <th>Order / receipt</th>
                <td className={tone(packet.order_status)}>{packet.order_status || '—'}</td>
              </tr>
              <tr>
                <th>Delivery</th>
                <td className={tone(packet.delivery_status)}>{packet.delivery_status || 'N/A'}</td>
              </tr>
              <tr>
                <th>Digital / service</th>
                <td className={tone(packet.service_status)}>{packet.service_status || 'N/A'}</td>
              </tr>
              <tr>
                <th>Policy at purchase</th>
                <td className={tone(packet.policy_at_purchase_status)}>{packet.policy_at_purchase_status}</td>
              </tr>
              <tr>
                <th>Policy acceptance</th>
                <td className={tone(packet.policy_acceptance_status)}>{packet.policy_acceptance_status}</td>
              </tr>
              <tr>
                <th>Readiness</th>
                <td>
                  {packet.readiness.required_found} / {packet.readiness.required_total} required found
                </td>
              </tr>
            </tbody>
          </table>
          <div className={styles.row}>
            <button type="button" className={styles.button} disabled={busy} onClick={() => void refresh()}>
              {busy ? 'Refreshing…' : 'Refresh Evidence'}
            </button>
            <Link className={styles.secondary} to="lineage" style={{ display: 'inline-flex', alignItems: 'center' }}>
              View Lineage
            </Link>
            <button type="button" className={styles.button} disabled={!packet.continue_allowed}>
              Continue
            </button>
          </div>
        </section>
      )}
      {error ? <p className={styles.error}>{error}</p> : null}
      <section className={styles.card}>
        <div className={styles.cardTitle}>Later modules</div>
        <p className={styles.meta}>CB6 / remaining CB5 communication, mapping, files, and Stripe submit are not implemented here.</p>
        <div className={styles.later}>
          {LATER.map((label) => (
            <span key={label} className={styles.laterItem}>
              {label}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
