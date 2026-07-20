import { FormEvent, useEffect, useState } from 'react';

import { useAuth } from '../../context/AuthContext';
import { ensureBackendServiceReady, getApiError, warmupBackend } from '../../lib/api';
import { loginCredentialErrorMessage } from '../../lib/emailValidation';
import styles from './PostPaymentSignInModal.module.css';

export const POST_PAYMENT_SIGNIN_KEY = 'asktill_need_post_payment_signin';

export function markPostPaymentSignInRequired() {
  try {
    sessionStorage.setItem(POST_PAYMENT_SIGNIN_KEY, '1');
  } catch {
    /* private mode */
  }
}

export function clearPostPaymentSignInRequired() {
  try {
    sessionStorage.removeItem(POST_PAYMENT_SIGNIN_KEY);
  } catch {
    /* private mode */
  }
}

export function isPostPaymentSignInRequired(): boolean {
  try {
    return sessionStorage.getItem(POST_PAYMENT_SIGNIN_KEY) === '1';
  } catch {
    return false;
  }
}

interface Props {
  open: boolean;
  onActivated: () => void;
}

export default function PostPaymentSignInModal({ open, onActivated }: Props) {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setEmail((user?.email ?? '').trim());
    setPassword('');
    setError('');
    setShowPassword(false);
  }, [open, user?.email]);

  if (!open) return null;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || password.length < 8) {
      setError('Enter your email and password to activate uploads.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await login(trimmed, password);
      warmupBackend();
      void ensureBackendServiceReady(45_000);
      clearPostPaymentSignInRequired();
      onActivated();
    } catch (err) {
      setError(loginCredentialErrorMessage(err) || getApiError(err, 'Invalid email or password.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-pay-signin-title"
    >
      <div className={styles.card}>
        <h2 id="post-pay-signin-title" className={styles.title}>
          Sign in to activate
        </h2>
        <p className={styles.body}>
          Payment succeeded. Confirm your email and password once to unlock fast uploads on your
          Paid plan.
        </p>

        <form className={styles.form} onSubmit={(ev) => void onSubmit(ev)}>
          <label className={styles.label} htmlFor="post-pay-email">
            Email
          </label>
          <input
            id="post-pay-email"
            className={styles.input}
            type="email"
            autoComplete="username"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            disabled={submitting}
            required
          />

          <label className={styles.label} htmlFor="post-pay-password">
            Password
          </label>
          <div className={styles.passwordRow}>
            <input
              id="post-pay-password"
              className={styles.input}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              disabled={submitting}
              required
              minLength={8}
            />
            <button
              type="button"
              className={styles.showBtn}
              onClick={() => setShowPassword((v) => !v)}
              disabled={submitting}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className={styles.primaryBtn} disabled={submitting}>
            {submitting ? 'Confirming…' : 'Confirm and continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
