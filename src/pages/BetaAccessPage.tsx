import { useState, type FormEvent } from 'react';

import AuthNav from '../components/auth/AuthNav';
import Logo from '../components/common/Logo';
import {
  submitBetaAccessRequest,
  type BetaAccessPayload,
} from '../lib/publicBetaGate';

import styles from './BetaAccessPage.module.css';

type Props = {
  /** Which auth nav tab to highlight when shown behind Sign in / Sign up. */
  navActive?: 'signin' | 'signup';
};

type FormState = BetaAccessPayload;

const EMPTY: FormState = {
  email: '',
  location: '',
  segment: '',
};

/**
 * EC2 / asktill.com only — public beta hold page with brand logo + request form.
 * Submissions email the Agents BETA_NOTIFY_EMAIL / SUPPORT_NOTIFY_EMAIL inbox.
 */
export default function BetaAccessPage({ navActive = 'signin' }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || doneMessage) return;

    const payload: BetaAccessPayload = {
      email: form.email.trim(),
      location: form.location.trim(),
      segment: form.segment.trim(),
    };

    if (!payload.email || !payload.location || !payload.segment) {
      setError('Please fill in all fields.');
      return;
    }
    if (!payload.email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await submitBetaAccessRequest(payload);
      setDoneMessage(res.message);
      setForm(EMPTY);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your request.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <AuthNav active={navActive} />
      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.logoWrap}>
            <Logo to="/" size={32} />
          </div>

          <p className={styles.eyebrow}>Beta</p>
          <h1 className={styles.heading}>Welcome to Asktill</h1>
          <p className={styles.tagline}>Finance made simple for SMBs.</p>

          <div className={styles.body}>
            <p>
              Portal is open for <strong>Beta testing</strong>. Enter your details and we
              will contact you back.
            </p>
          </div>

          {doneMessage ? (
            <div className={styles.success} role="status">
              <p>{doneMessage}</p>
              <p className={styles.note}>
                After we review your details, we will reply with a private invite link.
              </p>
            </div>
          ) : (
            <form className={styles.form} onSubmit={onSubmit} noValidate>
              <label className={styles.field}>
                <span>Email</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  placeholder="you@yourbusiness.com"
                  required
                  disabled={submitting}
                />
              </label>

              <label className={styles.field}>
                <span>Location (applicable to USA only)</span>
                <input
                  name="location"
                  autoComplete="address-level2"
                  value={form.location}
                  onChange={(e) => update('location', e.target.value)}
                  placeholder="City, State"
                  required
                  disabled={submitting}
                />
              </label>

              <label className={styles.field}>
                <span>Segment</span>
                <input
                  name="segment"
                  value={form.segment}
                  onChange={(e) => update('segment', e.target.value)}
                  placeholder="e.g. Restaurant, Retail, Ecommerce"
                  required
                  disabled={submitting}
                />
              </label>

              {error ? (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              ) : null}

              <button className={styles.cta} type="submit" disabled={submitting}>
                {submitting ? 'Sending…' : 'Request Beta access'}
              </button>

              <p className={styles.note}>
                After we review your details, we will reply with a private invite link.
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
