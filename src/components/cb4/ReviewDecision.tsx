import { useEffect, useState } from 'react';
import {
  approveCb4Decision,
  getCb4Decision,
  proposeCb4Decision,
  type Cb4DecisionWorkflow,
} from '../../lib/chargebacksClient';
import cb4 from '../../pages/Cb4Pages.module.css';

export default function ReviewDecision({
  decisionId,
  onOverride,
  onChanged,
}: {
  decisionId: string;
  onOverride: () => void;
  onChanged?: (decision: Cb4DecisionWorkflow) => void;
}) {
  const [decision, setDecision] = useState<Cb4DecisionWorkflow | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getCb4Decision(decisionId).then(setDecision).catch((err: Error) => setMessage(err.message));
  }, [decisionId]);

  if (!decision) {
    return (
      <section className={cb4.card}>
        <p className={cb4.meta}>{message || 'Loading decision…'}</p>
      </section>
    );
  }

  async function approve() {
    setBusy(true);
    setMessage('');
    try {
      let current = decision;
      if (!current) return;
      if (!current.proposed_final_decision) {
        current = await proposeCb4Decision(decisionId, current.recommendation);
        setDecision(current);
      }
      const next = await approveCb4Decision(decisionId);
      setDecision(next);
      onChanged?.(next);
      setMessage('Internal CB4 decision approved. This is not a Stripe action.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not approve.');
    } finally {
      setBusy(false);
    }
  }

  const target = decision.proposed_final_decision || decision.recommendation;

  return (
    <section className={cb4.card}>
      <div className={cb4.cardTitle}>Review Decision</div>
      <p className={cb4.note}>
        Approval is a final internal CB4 decision, not a Stripe submit or accept.
      </p>
      <div className={cb4.label}>AskTill recommendation</div>
      <div className={cb4.result}>{decision.recommendation.replace(/_/g, ' ')}</div>
      <div className={cb4.label}>Proposed decision</div>
      <div className={cb4.meta}>{decision.proposed_final_decision || 'Not proposed yet'}</div>
      <div className={cb4.label}>Approval status</div>
      <div className={cb4.pending}>{decision.approval_status.replace(/_/g, ' ')}</div>
      <div className={cb4.label}>Final decision</div>
      <div className={cb4.meta}>{decision.final_decision.replace(/_/g, ' ')}</div>
      <div className={cb4.label}>Internal handoff</div>
      <div className={cb4.meta}>{decision.handoff_status.replace(/_/g, ' ')}</div>
      {decision.maker_checker_required ? (
        <p className={cb4.warn}>
          High-value maker-checker: the person who proposes cannot be the person who approves.
        </p>
      ) : null}
      {message ? (
        <p className={message.includes('approved') ? cb4.success : cb4.error}>{message}</p>
      ) : null}
      <div className={cb4.actions}>
        <button type="button" className={cb4.run} disabled={busy} onClick={() => void approve()}>
          {busy ? 'Working…' : `Approve ${target.replace(/_/g, ' ')}`}
        </button>
        <button type="button" className={cb4.evidenceBtn} onClick={onOverride}>
          Choose different action
        </button>
      </div>
    </section>
  );
}
