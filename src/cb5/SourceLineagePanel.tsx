import { useEffect, useState } from 'react';

import { getEvidenceLineage } from './api';
import { useEvidenceOutlet } from './EvidenceWorkspace';
import styles from './cb5.module.css';
import type { LineageResponse } from './types';

export default function SourceLineagePanel() {
  const { caseId, loading } = useEvidenceOutlet();
  const [data, setData] = useState<LineageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const next = await getEvidenceLineage(caseId);
        if (!cancelled) setData(next);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load lineage.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  if (loading && !data) return <div className={styles.card}>Loading lineage…</div>;

  return (
    <section className={styles.card}>
      <div className={styles.cardTitle}>Evidence source lineage</div>
      {data?.status === 'incomplete' ? (
        <div className={`${styles.banner} ${styles.bannerBlock}`}>
          Lineage incomplete. Affected fields: {(data.incomplete_fields || []).join(', ') || 'unknown'}
        </div>
      ) : (
        <div className={`${styles.banner} ${styles.bannerOk}`}>All populated fields have source ID, fetched_at, and extractor version.</div>
      )}
      {error ? <p className={styles.error}>{error}</p> : null}
      {(data?.conflicts || []).map((conflict) => (
        <div key={conflict.evidence_code} className={`${styles.banner} ${styles.bannerBlock}`}>
          {conflict.evidence_code} conflict:{' '}
          {conflict.values.map((item) => `${item.source_system}=${String(item.value)}`).join(' · ')}
        </div>
      ))}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Field</th>
            <th>Value</th>
            <th>Source</th>
            <th>Object ID</th>
            <th>Fetched</th>
            <th>Extractor</th>
          </tr>
        </thead>
        <tbody>
          {(data?.fields || []).map((row, index) => (
            <tr key={`${row.evidence_code}-${index}`}>
              <td>
                {row.evidence_code}
                {row.canonical ? ' ★' : ''}
              </td>
              <td>{typeof row.value === 'object' ? JSON.stringify(row.value) : String(row.value ?? '—')}</td>
              <td>{row.source_system}</td>
              <td>{row.source_object_id || '—'}</td>
              <td>{row.fetched_at || '—'}</td>
              <td>{row.extractor_version || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
