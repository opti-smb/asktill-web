import { useEffect, useState } from 'react';
import {
  approveCb4Decision,
  getCb4ReReview,
  proposeCb4Decision,
  type Cb4DecisionWorkflow,
  type Cb4ReReviewPayload,
} from '../../lib/chargebacksClient';
import cb4 from '../../pages/Cb4Pages.module.css';

export default function ReReviewRequired({
  decisionId,
  onChanged,
}: {
  decisionId: string;
  onChanged?: (decision: Cb4DecisionWorkflow) => void;
}) {
  const [payload, setPayload] = useState<Cb4ReReviewPayload | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    void getCb4ReReview(decisionId).then(setPayload).catch((err: Error) => setMessage(err.message));
  }, [decisionId]);

  if (!payload) {
    return (
      <section className={cb4.card}>
        <p className={cb4.meta}>{message || 'Loading re-review…'}</p>
      </section>
    );
  }

  async function approveCurrent() {
    const current = payload;
    if (!current) return;
    setMessage('');
    try {
      await proposeCb4Decision(decisionId, current.workflow.recommendation, 'Re-review after material input change');
      const next = await approveCb4Decision(decisionId, 'Re-approved after material input change');
      onChanged?.(next);
      setPayload(await getCb4ReReview(decisionId));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not re-approve.');
    }
  }

  return (
    <section className={cb4.card}>
      <div className={cb4.cardTitle}>Decision re-review required</div>
      <p className={cb4.warn}>
        A material input changed after approval. Internal handoff is blocked until an authorized
        reviewer approves the current inputs. No new FightApproved/AcceptApproved command is created
        until then.
      </p>
      <div className={cb4.label}>Previously approved</div>
      <div className={cb4.meta}>{payload.rereview?.previous_final_decision || payload.workflow.final_decision}</div>
      <div className={cb4.label}>New AskTill recommendation</div>
      <div className={cb4.meta}>{payload.workflow.recommendation}</div>
      <div className={cb4.label}>What changed</div>
      <div className={cb4.meta}>{(payload.rereview?.changed_fields || []).join(', ') || '—'}</div>
      <div className={cb4.label}>Handoff</div>
      <div className={cb4.pending}>{payload.workflow.handoff_status.replace(/_/g, ' ')}</div>
      {message ? <p className={cb4.error}>{message}</p> : null}
      <div className={cb4.actions}>
        <button type="button" className={cb4.run} onClick={() => void approveCurrent()}>
          Review and approve current recommendation
        </button>
      </div>
    </section>
  );
}
