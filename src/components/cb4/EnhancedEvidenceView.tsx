import { useEffect, useState } from 'react';
import { getCb4EnhancedEligibility, type Cb4EnhancedEligibility } from '../../lib/chargebacksClient';
import cb4 from '../../pages/Cb4Pages.module.css';

export default function EnhancedEvidenceView({ disputeId }: { disputeId: string }) {
  const [items, setItems] = useState<Cb4EnhancedEligibility[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!disputeId) return;
    void getCb4EnhancedEligibility(disputeId)
      .then(setItems)
      .catch((err: Error) => setError(err.message));
  }, [disputeId]);

  return (
    <section className={cb4.card}>
      <div className={cb4.cardTitle}>Enhanced Evidence</div>
      <p className={cb4.note}>
        Eligibility can strengthen a case; it does not guarantee a win. Evidence, deadline, economics
        and merchant policy still apply.
      </p>
      {error ? <p className={cb4.error}>{error}</p> : null}
      {items.length === 0 ? <p className={cb4.meta}>No enhanced eligibility reported.</p> : null}
      {items.map((item) => (
        <div key={item.enhanced_eligibility_id} className={cb4.item}>
          <div className={cb4.row} style={{ gridTemplateColumns: '1fr auto' }}>
            <div>
              <strong>{item.eligibility_type.replace(/_/g, ' ')}</strong>
              <div className={cb4.meta}>Source: {item.source}</div>
              {item.supporting_transactions.length ? (
                <div className={cb4.meta}>
                  {item.supporting_transactions.length} supporting transaction
                  {item.supporting_transactions.length === 1 ? '' : 's'}
                </div>
              ) : null}
            </div>
            <span className={`${cb4.pill} ${item.eligible ? cb4.pillOk : cb4.pillNo}`}>
              {item.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
            </span>
          </div>
        </div>
      ))}
    </section>
  );
}
