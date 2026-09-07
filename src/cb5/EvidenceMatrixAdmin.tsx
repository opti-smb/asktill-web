import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { getActiveTemplate, publishTemplateVersion } from './api';
import styles from './cb5.module.css';
import headerStyles from '../components/layout/SectionHeader.module.css';
import type { EvidenceRequirement, EvidenceTemplate, ProductType, RequirementLevel } from './types';

const REASONS = ['product_not_received', 'fraudulent', 'general'];
const PRODUCTS: ProductType[] = ['physical', 'digital', 'service', 'subscription'];

function blankReq(): EvidenceRequirement {
  return {
    evidence_code: '',
    display_name: '',
    requirement_level: 'optional',
    source_preference: '',
    description: '',
    sort_order: 0,
  };
}

export default function EvidenceMatrixAdmin() {
  const [reason, setReason] = useState('product_not_received');
  const [productType, setProductType] = useState<ProductType>('physical');
  const [template, setTemplate] = useState<EvidenceTemplate | null>(null);
  const [rows, setRows] = useState<EvidenceRequirement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const next = await getActiveTemplate(reason, productType);
      setTemplate(next);
      setRows(next.requirements || []);
    } catch (err) {
      setTemplate(null);
      setRows([]);
      setError(err instanceof Error ? err.message : 'Could not load matrix.');
    }
  }, [reason, productType]);

  useEffect(() => {
    void load();
  }, [load]);

  function patch(index: number, update: Partial<EvidenceRequirement>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...update } : row)));
  }

  async function publish() {
    if (!template) return;
    setBusy(true);
    setError(null);
    try {
      const next = await publishTemplateVersion(template.id, rows);
      setTemplate(next);
      setRows(next.requirements || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.main}>
        <Link to="/dashboard/chargebacks/settings" className={styles.back}>
          ← Chargeback Controls
        </Link>
        <h1 className={headerStyles.h1}>Evidence Matrix</h1>
        <p className={styles.lead}>
          Required / optional / prohibited evidence by dispute reason and product type. Publishing creates a new
          immutable version. Existing cases keep their old version.
        </p>
        <div className={`${styles.banner} ${styles.bannerWarn}`}>
          Publishing creates a new immutable version. Existing packets keep their old template version. Active
          historical versions are not edited in place.
        </div>
        <section className={styles.card}>
          <div className={styles.row}>
            <select className={styles.select} value={reason} onChange={(event) => setReason(event.target.value)}>
              {REASONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select
              className={styles.select}
              value={productType}
              onChange={(event) => setProductType(event.target.value as ProductType)}
            >
              {PRODUCTS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <span className={styles.meta}>Active version {template?.version ?? '—'}</span>
          </div>
          {error ? <p className={styles.error}>{error}</p> : null}
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Evidence item</th>
                <th>Level</th>
                <th>Preferred source</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.evidence_code}-${index}`}>
                  <td>
                    <input
                      className={styles.input}
                      value={row.display_name}
                      placeholder="Display name"
                      onChange={(event) =>
                        patch(index, { display_name: event.target.value, evidence_code: row.evidence_code || event.target.value })
                      }
                    />
                    <div className={styles.meta}>{row.evidence_code || 'code'}</div>
                  </td>
                  <td>
                    <select
                      className={styles.select}
                      value={row.requirement_level}
                      onChange={(event) => patch(index, { requirement_level: event.target.value as RequirementLevel })}
                    >
                      <option value="required">REQUIRED</option>
                      <option value="optional">OPTIONAL</option>
                      <option value="prohibited">PROHIBITED</option>
                    </select>
                  </td>
                  <td>
                    <input
                      className={styles.input}
                      value={row.source_preference || ''}
                      onChange={(event) => patch(index, { source_preference: event.target.value })}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className={styles.secondary}
                      onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={styles.row}>
            <button type="button" className={styles.secondary} onClick={() => setRows((prev) => [...prev, blankReq()])}>
              Add Requirement
            </button>
            <button type="button" className={styles.button} disabled={busy || !template} onClick={() => void publish()}>
              {busy ? 'Publishing…' : 'Publish New Version'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
