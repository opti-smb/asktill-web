import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { listCb4ReasonPolicies, type Cb4ReasonPolicy } from '../lib/chargebacksClient';
import styles from './AtChargebacksPage.module.css';
import cb4 from './Cb4Pages.module.css';
import headerStyles from '../components/layout/SectionHeader.module.css';

export default function Cb4PoliciesPage() {
  const [policies, setPolicies] = useState<Cb4ReasonPolicy[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listCb4ReasonPolicies()
      .then((rows) => {
        if (!cancelled) setPolicies(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load reason policies.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={cb4.page}>
      <div className={cb4.main}>
        <Link to="/dashboard/chargebacks" className={cb4.back}>
          ← Money Reclaimed
        </Link>
        <div className={styles.titleChrome}>
          <h1 className={headerStyles.h1}>Reason policies</h1>
        </div>
        <p className={cb4.lead}>
          Read-only CB4-03 checklists for the current merchant flow. Merchants cannot edit these or
          overwrite policy versions. AskTill admins publish a new version through the API; v1 rows
          stay on file. Evidence readiness is completeness only, not win probability.
        </p>
        {error ? <p className={cb4.error}>{error}</p> : null}
        {policies.map((policy) => (
          <section key={policy.reason_policy_id} className={cb4.card}>
            <div className={cb4.cardTitle}>{policy.display_name}</div>
            <div className={cb4.meta}>
              {policy.reason_code} · version {policy.policy_version} · minimum evidence score to
              recommend FIGHT {policy.minimum_score_to_fight} · missing mandatory →{' '}
              {policy.missing_mandatory_action.replace(/_/g, ' ')}
            </div>
            <table className={cb4.reqTable}>
              <thead>
                <tr>
                  <th>Evidence</th>
                  <th>Mandatory</th>
                  <th>Weight</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {policy.requirements.map((req) => (
                  <tr key={req.evidence_code}>
                    <td>{req.display_name}</td>
                    <td>{req.mandatory ? <span className={cb4.badge}>Yes</span> : 'No'}</td>
                    <td>{req.weight}</td>
                    <td>{req.preferred_source || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </div>
  );
}
