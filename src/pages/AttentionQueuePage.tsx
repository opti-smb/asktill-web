import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { getOpenHumanQuestions, type HumanQuestionView } from '../lib/chargebacksClient';
import cb4 from './Cb4Pages.module.css';
import headerStyles from '../components/layout/SectionHeader.module.css';

export default function AttentionQueuePage() {
  const [rows, setRows] = useState<HumanQuestionView[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getOpenHumanQuestions()
      .then((next) => {
        if (!cancelled) setRows(next);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load attention queue.');
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
        <h1 className={headerStyles.h1}>Attention queue</h1>
        <p className={cb4.lead}>
          Open questions that need a merchant answer. This is not the full Command Center and does
          not change Fight/Accept by itself.
        </p>
        {error ? <p className={cb4.error}>{error}</p> : null}
        <section className={cb4.card}>
          <table className={cb4.queueTable}>
            <thead>
              <tr>
                <th>Case</th>
                <th>Reason</th>
                <th>Question type</th>
                <th>Title</th>
                <th>Created at</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const caseId = row.case_id || row.dispute_case_id || '';
                return (
                  <tr key={row.id}>
                    <td>{caseId || '—'}</td>
                    <td>—</td>
                    <td>{(row.question_type || '—').replace(/_/g, ' ')}</td>
                    <td>{row.title || '—'}</td>
                    <td>{row.created_at ? row.created_at.slice(0, 16).replace('T', ' ') : '—'}</td>
                    <td>
                      {caseId ? (
                        <Link
                          to={`/dashboard/chargebacks/decision/${encodeURIComponent(caseId)}`}
                          className={cb4.policiesLink}
                        >
                          Open case
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length && !error ? <p className={cb4.meta}>No open questions.</p> : null}
        </section>
      </div>
    </div>
  );
}
