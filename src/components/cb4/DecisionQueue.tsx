import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCb4DecisionQueue, type Cb4QueueItem } from '../../lib/chargebacksClient';
import cb4 from '../../pages/Cb4Pages.module.css';

const FILTERS = ['', 'CRITICAL', 'URGENT', 'HIGH', 'NORMAL', 'NEEDS_EVIDENCE', 'RE_REVIEW'] as const;

export default function DecisionQueue() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Cb4QueueItem[]>([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void getCb4DecisionQueue(filter || undefined)
      .then(setItems)
      .catch((err: Error) => setError(err.message));
  }, [filter]);

  return (
    <section className={cb4.card}>
      <div className={cb4.cardTitle}>Chargeback Decision Queue</div>
      <p className={cb4.note}>
        Work urgent cases first. Queue priority does not change the final decision. Internal CB4
        review only — this is not a Stripe action.
      </p>
      <div className={cb4.actions}>
        {FILTERS.map((value) => (
          <button
            key={value || 'ALL'}
            type="button"
            className={filter === value ? cb4.run : cb4.evidenceBtn}
            onClick={() => setFilter(value)}
          >
            {value ? value.replace(/_/g, ' ') : 'All'}
          </button>
        ))}
      </div>
      {error ? <p className={cb4.error}>{error}</p> : null}
      <table className={cb4.queueTable}>
        <thead>
          <tr>
            <th>Priority</th>
            <th>Due</th>
            <th>Amount</th>
            <th>Reason</th>
            <th>Evidence</th>
            <th>Ready</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={7} className={cb4.meta}>
                No decisions in this queue yet. Generate a recommendation first.
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr
                key={item.decision_id}
                className={item.priority === 'CRITICAL' ? cb4.critical : item.priority === 'URGENT' ? cb4.urgent : undefined}
              >
                <td>
                  <strong>{item.priority}</strong>
                  {item.re_review_required ? ' · re-review' : ''}
                </td>
                <td>{item.hours_remaining.toFixed(1)}h</td>
                <td>
                  {item.currency} {item.amount}
                </td>
                <td>{item.reason_code.replace(/_/g, ' ')}</td>
                <td>{item.evidence_score}</td>
                <td>{item.readiness_status.replace(/_/g, ' ')}</td>
                <td>
                  <button
                    type="button"
                    className={cb4.evidenceBtn}
                    onClick={() =>
                      navigate(`/dashboard/chargebacks/decision/${encodeURIComponent(item.dispute_id)}`)
                    }
                  >
                    Open
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
