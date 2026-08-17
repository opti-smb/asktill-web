import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useClerk, useSignUp } from '@clerk/clerk-react';
import { useSearchParams } from 'react-router-dom';

import AuthNav from '../components/auth/AuthNav';
import ClerkCaptcha, { prepareClerkCaptcha } from '../components/auth/ClerkCaptcha';
import Logo from '../components/common/Logo';
import OtpInput, { type OtpInputStatus } from '../components/auth/OtpInput';
import {
  clearClerkSession,
  clerkErrorMessage,
  isClerkAlreadySignedInError,
  isClerkCaptchaError,
  isClerkEnabled,
} from '../lib/clerk';
import { normalizeEmail, validateEmailInput } from '../lib/emailValidation';
import {
  submitBetaAccessRequest,
  type BetaAccessPayload,
} from '../lib/publicBetaGate';

import styles from './BetaAccessPage.module.css';

type Props = {
  /** Which auth nav tab to highlight when shown behind Sign in / Sign up. */
  navActive?: 'signin' | 'signup';
};

type Step = 'email' | 'otp' | 'details';

type FormState = BetaAccessPayload;

function emptyForm(email = ''): FormState {
  return { email, location: '', segment: '' };
}

function tempClerkPassword() {
  const r = crypto.randomUUID().replace(/-/g, '');
  return `At${r.slice(0, 10)}!9`;
}

function isEmailVerifiedInClerk(signUp: ReturnType<typeof useSignUp>['signUp']) {
  const unverified = signUp?.unverifiedFields ?? [];
  if (unverified.includes('email_address')) return false;
  const status = signUp?.verifications?.emailAddress?.status;
  return status === 'verified' || signUp?.status === 'complete';
}

async function satisfyClerkPassword(
  signUp: NonNullable<ReturnType<typeof useSignUp>['signUp']>,
  password: string,
) {
  const missing = signUp.missingFields ?? [];
  if (!missing.includes('password')) return;
  await signUp.update({ password });
}

function friendlyClerkError(err: unknown, fallback: string): string {
  const raw = clerkErrorMessage(err, fallback);
  if (/incorrect password/i.test(raw)) {
    return 'Could not start email verification. Refresh the page and try again.';
  }
  return raw;
}

/**
 * EC2 / asktill.com only — public beta hold page.
 * Verifies email with Clerk OTP (same strategy as /register), then collects details.
 * Does NOT call setActive / complete signup — no app session from this page.
 * Cleared Clerk client afterward so asktill.com OTP does not leave a sticky signup
 * that interferes with Vercel register on another host.
 */
export default function BetaAccessPage({ navActive = 'signin' }: Props) {
  const clerk = useClerk();
  const { isLoaded, signUp } = useSignUp();
  const [searchParams] = useSearchParams();
  const clerkOn = isClerkEnabled();

  const initialEmail = normalizeEmail(searchParams.get('email') || '');
  const [step, setStep] = useState<Step>('email');
  const [form, setForm] = useState<FormState>(() => emptyForm(initialEmail));
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const lastOtpAttemptRef = useRef('');

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
  }

  async function deliverCode(addr: string): Promise<'sent' | 'already_verified' | 'redirecting'> {
    await prepareClerkCaptcha();
    if (!signUp) throw new Error('Auth is still loading.');

    if (isEmailVerifiedInClerk(signUp) && normalizeEmail(signUp.emailAddress || '') === addr) {
      return 'already_verified';
    }

    const tempPw = tempClerkPassword();
    const clerkEmail = normalizeEmail(signUp.emailAddress || '');
    const emailChanged = Boolean(signUp.id && clerkEmail && clerkEmail !== addr);

    try {
      if (!signUp.id) {
        try {
          await signUp.create({ emailAddress: addr, password: tempPw });
        } catch (createErr) {
          if (!signUp.id) {
            await signUp.create({ emailAddress: addr });
          }
          try {
            await satisfyClerkPassword(signUp, tempPw);
          } catch {
            throw createErr;
          }
        }
      } else if (emailChanged || !clerkEmail) {
        await signUp.update({ emailAddress: addr });
        await satisfyClerkPassword(signUp, tempPw);
      } else {
        await satisfyClerkPassword(signUp, tempPw);
      }
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      return 'sent';
    } catch (err) {
      if (!isClerkAlreadySignedInError(err)) throw err;
      await clearClerkSession(clerk, {
        redirectUrl: `${window.location.origin}/login`,
      });
      window.location.assign(`/login?email=${encodeURIComponent(addr)}&beta=1`);
      return 'redirecting';
    }
  }

  async function onSendCode(e: FormEvent) {
    e.preventDefault();
    if (submitting || doneMessage) return;
    setError(null);
    setInfo(null);

    const validation = validateEmailInput(form.email);
    if (!validation.ok) {
      setError(validation.message ?? 'Enter a valid email address.');
      return;
    }
    if (!clerkOn) {
      setError('Email verification is not configured. Please try again later.');
      return;
    }
    if (!isLoaded || !signUp) {
      setError('Auth is still loading. Please wait and try again.');
      return;
    }

    const addr = normalizeEmail(form.email);
    setSubmitting(true);
    try {
      const result = await deliverCode(addr);
      if (result === 'redirecting') return;
      setForm((prev) => ({ ...prev, email: addr }));
      if (result === 'already_verified') {
        setEmailVerified(true);
        setStep('details');
        setInfo('Email already verified. Complete the form below.');
      } else {
        setStep('otp');
        setCode('');
        lastOtpAttemptRef.current = '';
        setInfo('We sent a 6-digit code to your email.');
      }
    } catch (err) {
      setError(friendlyClerkError(err, 'Could not send verification email.'));
      if (isClerkCaptchaError(err)) setStep('email');
    } finally {
      setSubmitting(false);
    }
  }

  async function onResendCode() {
    if (submitting || !form.email) return;
    setError(null);
    setCode('');
    lastOtpAttemptRef.current = '';
    setSubmitting(true);
    try {
      const result = await deliverCode(normalizeEmail(form.email));
      if (result === 'redirecting') return;
      if (result === 'already_verified') {
        setEmailVerified(true);
        setStep('details');
      } else {
        setInfo('A new code was sent.');
      }
    } catch (err) {
      setError(friendlyClerkError(err, 'Could not resend code.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyOtpCode(otp: string) {
    if (submitting || !signUp) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: otp });
      const verified =
        result.verifications?.emailAddress?.status === 'verified' ||
        signUp.verifications?.emailAddress?.status === 'verified' ||
        isEmailVerifiedInClerk(signUp);
      if (!verified) {
        throw new Error('Invalid or expired code.');
      }
      // Do NOT setActive / complete signup — beta gate only proves email ownership.
      setEmailVerified(true);
      setStep('details');
      setInfo(null);
      setCode('');
    } catch (err) {
      setError(friendlyClerkError(err, 'Incorrect code. Please try again.'));
      lastOtpAttemptRef.current = '';
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (step !== 'otp') return;
    const otp = code.replace(/\D/g, '');
    if (otp.length !== 6) return;
    if (lastOtpAttemptRef.current === otp) return;
    lastOtpAttemptRef.current = otp;
    void verifyOtpCode(otp);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional auto-submit on 6 digits
  }, [code, step]);

  async function onSubmitDetails(e: FormEvent) {
    e.preventDefault();
    if (submitting || doneMessage || !emailVerified) return;

    const payload: BetaAccessPayload = {
      email: normalizeEmail(form.email),
      location: form.location.trim(),
      segment: form.segment.trim(),
    };

    if (!payload.email || !payload.location || !payload.segment) {
      setError('Please fill in all fields.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await submitBetaAccessRequest(payload);
      setDoneMessage(res.message);
      setForm(emptyForm());
      setEmailVerified(false);
      setStep('email');
      // Drop incomplete Clerk signup so it does not stick across hosts/sessions.
      await clearClerkSession(clerk, { stayOnPage: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your request.');
    } finally {
      setSubmitting(false);
    }
  }

  const otpStatus: OtpInputStatus = error && step === 'otp' ? 'error' : 'default';

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
              Portal is open for <strong>Beta testing</strong>. Verify your email, then enter
              your details and we will contact you back.
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
            <>
              {step === 'email' ? (
                <form className={styles.form} onSubmit={onSendCode} noValidate>
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
                  <ClerkCaptcha />
                  {error ? (
                    <p className={styles.error} role="alert">
                      {error}
                    </p>
                  ) : null}
                  <button className={styles.cta} type="submit" disabled={submitting || !isLoaded}>
                    {submitting ? 'Sending…' : 'Send verification code'}
                  </button>
                  <p className={styles.note}>
                    We use email verification (same as Asktill signup) to confirm your address.
                  </p>
                </form>
              ) : null}

              {step === 'otp' ? (
                <form
                  className={styles.form}
                  onSubmit={(e) => {
                    e.preventDefault();
                    const otp = code.replace(/\D/g, '');
                    if (otp.length === 6) void verifyOtpCode(otp);
                  }}
                  noValidate
                >
                  <p className={styles.note} style={{ margin: 0 }}>
                    Code sent to <strong>{form.email}</strong>
                  </p>
                  {info ? <p className={styles.note}>{info}</p> : null}
                  <OtpInput
                    value={code}
                    onChange={setCode}
                    disabled={submitting}
                    status={otpStatus}
                  />
                  <ClerkCaptcha variant="compact" />
                  {error ? (
                    <p className={styles.error} role="alert">
                      {error}
                    </p>
                  ) : null}
                  <button className={styles.cta} type="submit" disabled={submitting || code.length < 6}>
                    {submitting ? 'Verifying…' : 'Verify email'}
                  </button>
                  <button
                    className={styles.linkBtn}
                    type="button"
                    disabled={submitting}
                    onClick={() => void onResendCode()}
                  >
                    Resend code
                  </button>
                  <button
                    className={styles.linkBtn}
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      setStep('email');
                      setCode('');
                      setError(null);
                      setInfo(null);
                    }}
                  >
                    Change email
                  </button>
                </form>
              ) : null}

              {step === 'details' ? (
                <form className={styles.form} onSubmit={onSubmitDetails} noValidate>
                  <label className={styles.field}>
                    <span>Email (verified)</span>
                    <input name="email" type="email" value={form.email} disabled readOnly />
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
              ) : null}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
