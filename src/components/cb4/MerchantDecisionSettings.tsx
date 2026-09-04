import { FormEvent, useEffect, useState } from 'react';
import {
  getCb4MerchantPolicy,
  saveCb4MerchantPolicy,
  type Cb4MerchantDecisionPolicy,
} from '../../lib/chargebacksClient';
import cb4 from '../../pages/Cb4Pages.module.css';

export default function MerchantDecisionSettings() {
  const [policy, setPolicy] = useState<Cb4MerchantDecisionPolicy | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    void getCb4MerchantPolicy().then(setPolicy).catch((err: Error) => setMessage(err.message));
  }, []);

  if (!policy) {
    return (
      <section className={cb4.card}>
        <p className={cb4.meta}>{message || 'Loading settings…'}</p>
      </section>
    );
  }

  function update<K extends keyof Cb4MerchantDecisionPolicy>(key: K, value: Cb4MerchantDecisionPolicy[K]) {
    setPolicy((current) => (current ? { ...current, [key]: value } : current));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const current = policy;
    if (!current) return;
    setSaving(true);
    setMessage('');
    try {
      const saved = await saveCb4MerchantPolicy({
        min_evidence_score_to_fight: Number(current.min_evidence_score_to_fight),
        auto_accept_ceiling: String(current.auto_accept_ceiling),
        mandatory_review_amount: String(current.mandatory_review_amount),
        maker_checker_amount: String(current.maker_checker_amount),
        minimum_expected_net_value: String(current.minimum_expected_net_value),
        operational_buffer_hours: Number(current.operational_buffer_hours),
        timezone: current.timezone,
      });
      setPolicy(saved);
      setMessage(`Saved version ${saved.version}.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={cb4.card} onSubmit={(e) => void submit(e)}>
      <div className={cb4.cardTitle}>Chargeback Decision Settings</div>
      <p className={cb4.note}>
        These settings change recommendations and workflow only. They do not auto-submit or auto-accept
        a Stripe dispute.
      </p>
      {policy.inherited_from_global ? (
        <p className={cb4.warn}>Using global safe defaults until you save merchant-specific settings.</p>
      ) : (
        <p className={cb4.meta}>Active version {policy.version}</p>
      )}
      <label className={cb4.label} htmlFor="min-score">
        Minimum evidence score to recommend Fight
      </label>
      <input
        id="min-score"
        className={cb4.input}
        type="number"
        min={0}
        max={100}
        value={policy.min_evidence_score_to_fight}
        onChange={(e) => update('min_evidence_score_to_fight', Number(e.target.value))}
      />
      <label className={cb4.label} htmlFor="auto-accept">
        Recommend Accept below
      </label>
      <input
        id="auto-accept"
        className={cb4.input}
        value={policy.auto_accept_ceiling}
        onChange={(e) => update('auto_accept_ceiling', e.target.value)}
      />
      <label className={cb4.label} htmlFor="mandatory">
        Mandatory review above
      </label>
      <input
        id="mandatory"
        className={cb4.input}
        value={policy.mandatory_review_amount}
        onChange={(e) => update('mandatory_review_amount', e.target.value)}
      />
      <label className={cb4.label} htmlFor="maker">
        Maker-checker required above
      </label>
      <input
        id="maker"
        className={cb4.input}
        value={policy.maker_checker_amount}
        onChange={(e) => update('maker_checker_amount', e.target.value)}
      />
      <label className={cb4.label} htmlFor="buffer">
        Operational buffer (hours)
      </label>
      <input
        id="buffer"
        className={cb4.input}
        type="number"
        min={1}
        max={168}
        value={policy.operational_buffer_hours}
        onChange={(e) => update('operational_buffer_hours', Number(e.target.value))}
      />
      <label className={cb4.label} htmlFor="net">
        Minimum expected net value
      </label>
      <input
        id="net"
        className={cb4.input}
        value={policy.minimum_expected_net_value}
        onChange={(e) => update('minimum_expected_net_value', e.target.value)}
      />
      <label className={cb4.label} htmlFor="tz">
        Timezone
      </label>
      <input
        id="tz"
        className={cb4.input}
        value={policy.timezone}
        onChange={(e) => update('timezone', e.target.value)}
      />
      {message ? <p className={message.startsWith('Saved') ? cb4.success : cb4.error}>{message}</p> : null}
      <div className={cb4.actions}>
        <button type="submit" className={cb4.run} disabled={saving}>
          {saving ? 'Saving…' : 'Save as New Version'}
        </button>
      </div>
    </form>
  );
}
