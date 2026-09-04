import { FormEvent, useState } from 'react';
import {
  overrideCb4Decision,
  type Cb4DecisionValue,
  type Cb4DecisionWorkflow,
} from '../../lib/chargebacksClient';
import cb4 from '../../pages/Cb4Pages.module.css';

const REASONS = [
  'CUSTOMER_RELATIONSHIP',
  'KNOWN_MERCHANT_ERROR',
  'LOW_VALUE',
  'EVIDENCE_INACCURATE',
  'COMMERCIAL_SETTLEMENT',
  'POLICY_EXCEPTION',
  'OTHER',
] as const;

export default function OverrideDecision({
  decision,
  onDone,
  onCancel,
}: {
  decision: Cb4DecisionWorkflow;
  onDone: (next: Cb4DecisionWorkflow) => void;
  onCancel: () => void;
}) {
  const [newDecision, setNewDecision] = useState<Cb4DecisionValue>(
    decision.recommendation === 'FIGHT' ? 'ACCEPT' : 'FIGHT',
  );
  const [reason, setReason] = useState<(typeof REASONS)[number]>('CUSTOMER_RELATIONSHIP');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const next = await overrideCb4Decision(decision.decision_id, newDecision, reason, notes);
      onDone(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit override.');
    }
  }

  return (
    <form className={cb4.card} onSubmit={(e) => void submit(e)}>
      <div className={cb4.cardTitle}>Override AskTill Recommendation</div>
      <p className={cb4.warn}>
        The original recommendation and input snapshot are preserved. This override still requires
        approval. This does not call Stripe.
      </p>
      <div className={cb4.label}>AskTill recommends</div>
      <div className={cb4.meta}>{decision.recommendation}</div>
      <label className={cb4.label} htmlFor="override-action">
        Choose different action
      </label>
      <select
        id="override-action"
        className={cb4.select}
        value={newDecision}
        onChange={(e) => setNewDecision(e.target.value as Cb4DecisionValue)}
      >
        <option value="FIGHT">FIGHT</option>
        <option value="ACCEPT">ACCEPT</option>
        <option value="MANUAL_REVIEW">MANUAL_REVIEW</option>
      </select>
      <label className={cb4.label} htmlFor="override-reason">
        Override reason
      </label>
      <select
        id="override-reason"
        className={cb4.select}
        value={reason}
        onChange={(e) => setReason(e.target.value as (typeof REASONS)[number])}
      >
        {REASONS.map((code) => (
          <option key={code} value={code}>
            {code.replace(/_/g, ' ')}
          </option>
        ))}
      </select>
      <label className={cb4.label} htmlFor="override-notes">
        Notes
      </label>
      <textarea
        id="override-notes"
        className={cb4.input}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
      />
      {error ? <p className={cb4.error}>{error}</p> : null}
      <div className={cb4.actions}>
        <button type="submit" className={cb4.run}>
          Submit Override
        </button>
        <button type="button" className={cb4.evidenceBtn} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
