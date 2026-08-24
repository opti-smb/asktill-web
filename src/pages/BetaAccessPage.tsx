import { useEffect, useRef, useState } from 'react';
import { useClerk, useSignUp } from '@clerk/clerk-react';
import { Link, useSearchParams } from 'react-router-dom';

import AuthNav from '../components/auth/AuthNav';
import BusinessStateSelect from '../components/auth/BusinessStateSelect';
import ClerkCaptcha, { prepareClerkCaptcha } from '../components/auth/ClerkCaptcha';
import Logo from '../components/common/Logo';
import OtpInput, { type OtpInputStatus } from '../components/auth/OtpInput';
import { useAuth } from '../context/AuthContext';
import { checkEmail, getApiError, getToken, register as registerUser } from '../lib/api';
import {
  clearClerkSession,
  clerkErrorMessage,
  isClerkAlreadySignedInError,
  isClerkCaptchaError,
  isClerkEnabled,
} from '../lib/clerk';
import { normalizeEmail, validateEmailInput } from '../lib/emailValidation';
import { PASSWORD_HINT, validatePassword } from '../lib/passwordPolicy';
import { markPostLoginRouting } from '../lib/pendingPdfDownload';
import { continueOnVercelApp } from '../lib/vercelAppHandoff';
import {
  submitBetaAccessRequest,
  type BetaAccessPayload,
} from '../lib/publicBetaGate';
import { validateUsaOnlyLocation } from '../lib/usaBetaLocation';

import styles from './BetaAccessPage.module.css';

type Props = {
  /** Which auth nav tab to highlight when shown behind Sign in / Sign up. */
  navActive?: 'signin' | 'signup';
};

const OTHER_BUSINESS_TYPE = 'Other';

const BUSINESS_TYPE_OPTIONS = [
  'Retail & E-commerce',
  'Food & Hospitality',
  'Professional & Business Services',
  'Healthcare & Wellness',
  'Construction & Home Services',
  'Manufacturing, Wholesale & Logistics',
  'Technology & Digital',
  'Real Estate, Automotive & Other Services',
  OTHER_BUSINESS_TYPE,
] as const;

type FormState = {
  email: string;
  fullName: string;
  location: string;
  segment: string;
  segmentOther: string;
};

function emptyForm(email = ''): FormState {
  return { email, fullName: '', location: '', segment: '', segmentOther: '' };
}

function resolvedBusinessType(form: FormState): string {
  if (form.segment === OTHER_BUSINESS_TYPE) return form.segmentOther.trim();
  return form.segment.trim();
}

function businessTypeError(form: FormState): string | null {
  if (!form.segment.trim()) {
    return 'Select the type of business you run.';
  }
  if (form.segment === OTHER_BUSINESS_TYPE && !form.segmentOther.trim()) {
    return 'Enter your business type.';
  }
  return null;
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

function PasswordEyeIcon({ hidden }: { hidden: boolean }) {
  if (hidden) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
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
 * New user: email OTP → set password (EC2 DB) → EC2 upload/dashboard.
 * Existing user: password sign-in on asktill.com (EC2 DB). Vercel is not used.
 */
export default function BetaAccessPage({ navActive = 'signin' }: Props) {
  const clerk = useClerk();
  const { isLoaded, signUp } = useSignUp();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const clerkOn = isClerkEnabled();

  const initialEmail = normalizeEmail(searchParams.get('email') || '');
  const [form, setForm] = useState<FormState>(() => emptyForm(initialEmail));
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [existingAccount, setExistingAccount] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const lastOtpAttemptRef = useRef('');

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
  }

  function resetVerificationProgress() {
    if (!codeSent && !emailVerified && !existingAccount) return;
    setCodeSent(false);
    setEmailVerified(false);
    setExistingAccount(false);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setCode('');
    setInfo(null);
    lastOtpAttemptRef.current = '';
  }

  function onEmailChange(value: string) {
    update('email', value);
    resetVerificationProgress();
  }

  function onLocationChange(value: string) {
    update('location', value);
    // Changing country/location invalidates a prior OTP flow.
    resetVerificationProgress();
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
      await clearClerkSession(clerk, { stayOnPage: true });
      window.location.assign(`/register?email=${encodeURIComponent(addr)}`);
      return 'redirecting';
    }
  }

  async function enterEc2App() {
    markPostLoginRouting();
    await clearClerkSession(clerk, { stayOnPage: true });
    const token = getToken();
    if (continueOnVercelApp('/post-login', token)) return;
    setError('Could not open your Asktill workspace. Please try signing in again.');
  }

  async function onSendCode() {
    if (submitting || emailVerified || existingAccount) return;
    setError(null);
    setInfo(null);

    const validation = validateEmailInput(form.email);
    if (!validation.ok) {
      setError(validation.message ?? 'Enter a valid email address.');
      return;
    }
    if (!form.fullName.trim()) {
      setError('Enter your name.');
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
      let registered = false;
      try {
        const { data } = await checkEmail(addr);
        registered = Boolean(data.registered);
      } catch {
        registered = false;
      }
      if (registered) {
        setForm((prev) => ({ ...prev, email: addr }));
        setExistingAccount(true);
        setInfo('This email already has an Asktill account. Enter your password to continue to upload.');
        return;
      }

      const locationCheck = validateUsaOnlyLocation(form.location);
      if (!locationCheck.ok) {
        setError(locationCheck.message);
        return;
      }
      const typeError = businessTypeError(form);
      if (typeError) {
        setError(typeError);
        return;
      }

      const result = await deliverCode(addr);
      if (result === 'redirecting') return;
      setForm((prev) => ({ ...prev, email: addr }));
      if (result === 'already_verified') {
        setEmailVerified(true);
        setCodeSent(true);
        setInfo('Email verified. Set a password to continue.');
      } else {
        setCodeSent(true);
        setCode('');
        lastOtpAttemptRef.current = '';
        setInfo('We sent a 6-digit code to your email.');
      }
    } catch (err) {
      setError(friendlyClerkError(err, 'Could not send verification email.'));
      if (isClerkCaptchaError(err)) {
        setCodeSent(false);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function onResendCode() {
    if (submitting || !form.email || emailVerified) return;
    setError(null);
    setCode('');
    lastOtpAttemptRef.current = '';
    setSubmitting(true);
    try {
      const result = await deliverCode(normalizeEmail(form.email));
      if (result === 'redirecting') return;
      if (result === 'already_verified') {
        setEmailVerified(true);
        setInfo('Email verified. Set a password to continue.');
      } else {
        setInfo('A new code was sent.');
      }
    } catch (err) {
      setError(friendlyClerkError(err, 'Could not resend code.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function savePasswordAndEnterApp() {
    const typeError = businessTypeError(form);
    if (typeError) {
      setError(typeError);
      return;
    }
    const payload: BetaAccessPayload = {
      email: normalizeEmail(form.email),
      fullName: form.fullName.trim(),
      location: form.location.trim(),
      segment: resolvedBusinessType(form),
    };
    if (!payload.email || !payload.fullName || !payload.location || !payload.segment) {
      setError('Please fill in all fields.');
      return;
    }
    const locationCheck = validateUsaOnlyLocation(payload.location);
    if (!locationCheck.ok) {
      setError(locationCheck.message);
      return;
    }
    const passwordError = validatePassword(password, {
      email: payload.email,
      businessName: payload.segment,
      fullName: payload.fullName,
    });
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setInfo('Saving your account…');
    try {
      try {
        await registerUser({
          email: payload.email,
          password,
          businessName: payload.segment,
          fullName: payload.fullName,
          country: 'US',
          state: payload.location,
          industry: payload.segment,
        });
      } catch (err) {
        const message = getApiError(err, 'Could not create your account.');
        const axiosErr = err as { response?: { status?: number } };
        if (axiosErr.response?.status !== 409 && !/already exists/i.test(message)) {
          throw new Error(
            /sign-in service|google sign-in/i.test(message)
              ? 'Could not save your account. Wait a moment and try again.'
              : message,
          );
        }
      }

      void submitBetaAccessRequest(payload).catch(() => {});
      setInfo('Signing you in…');
      await login(payload.email, password);
      await enterEc2App();
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Could not save your password. Please try again.';
      setError(
        /sign-in service|google sign-in/i.test(raw)
          ? 'Could not save your account. Wait a moment and try again.'
          : raw,
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function onExistingSignIn() {
    if (submitting || !form.email || !password) return;
    setError(null);
    setSubmitting(true);
    setInfo('Signing you in…');
    try {
      await login(normalizeEmail(form.email), password);
      await enterEc2App();
    } catch (err) {
      const raw = getApiError(err, 'Could not sign in. Check your password and try again.');
      setError(
        /sign-in service|google sign-in/i.test(raw)
          ? 'Could not reach Asktill sign-in. Wait a moment and try again.'
          : raw,
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyOtpCode(otp: string) {
    if (submitting || !signUp || emailVerified) return;
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
      setEmailVerified(true);
      setCode('');
      setInfo('Email verified. Set a password, then continue to Asktill.');
    } catch (err) {
      if (isEmailVerifiedInClerk(signUp)) {
        setEmailVerified(true);
        setError(null);
        setInfo('Email verified. Set a password, then continue to Asktill.');
        return;
      }
      setError(friendlyClerkError(err, 'Incorrect code. Please try again.'));
      lastOtpAttemptRef.current = '';
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (!codeSent || emailVerified) return;
    const otp = code.replace(/\D/g, '');
    if (otp.length !== 6) return;
    if (lastOtpAttemptRef.current === otp) return;
    lastOtpAttemptRef.current = otp;
    void verifyOtpCode(otp);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional auto-submit on 6 digits
  }, [code, codeSent, emailVerified]);

  const otpStatus: OtpInputStatus = error && codeSent && !emailVerified ? 'error' : 'default';

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
          <p className={styles.tagline}>Finance made simple for SMBs</p>

          <div className={styles.body}>
            <p>
              Portal is open for <strong>Beta testing</strong>. New users verify email and set a
              password here. Then you sign in on Asktill.
            </p>
          </div>

          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
            }}
            noValidate
          >
            <label className={styles.field}>
              <span>Name</span>
              <input
                name="fullName"
                type="text"
                autoComplete="name"
                value={form.fullName}
                onChange={(e) => update('fullName', e.target.value)}
                placeholder="Your name"
                required
                disabled={submitting || emailVerified}
              />
            </label>

            <label className={styles.field}>
              <span>{emailVerified ? 'Email (verified)' : 'Email'}</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder="you@yourbusiness.com"
                required
                disabled={submitting || emailVerified}
                readOnly={emailVerified}
              />
            </label>

            <label className={styles.field}>
              <span>Business State (USA only)</span>
              <BusinessStateSelect
                value={form.location}
                onChange={onLocationChange}
                disabled={submitting || emailVerified}
              />
            </label>

            <label className={styles.field}>
              <span>What type of business you run?</span>
              <select
                name="segment"
                value={form.segment}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    segment: value,
                    segmentOther: value === OTHER_BUSINESS_TYPE ? prev.segmentOther : '',
                  }));
                  if (error) setError(null);
                }}
                required
                disabled={submitting || emailVerified}
              >
                <option value="" disabled>
                  Select a type
                </option>
                {BUSINESS_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            {form.segment === OTHER_BUSINESS_TYPE ? (
              <label className={styles.field}>
                <span>Enter that</span>
                <input
                  name="segmentOther"
                  value={form.segmentOther}
                  onChange={(e) => update('segmentOther', e.target.value)}
                  placeholder="Type of business"
                  required
                  disabled={submitting || emailVerified}
                />
              </label>
            ) : null}

            {existingAccount ? (
              <>
                <p className={styles.note} role="status">
                  {info || 'This email already has an Asktill account. Enter your password to continue to upload.'}
                </p>
                <label className={styles.field}>
                  <span>Password</span>
                  <div className={styles.passwordWrap}>
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="Your password"
                      required
                      disabled={submitting}
                    />
                    <button
                      type="button"
                      className={styles.eyeBtn}
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      <PasswordEyeIcon hidden={showPassword} />
                    </button>
                  </div>
                </label>
                <button
                  className={styles.cta}
                  type="button"
                  disabled={submitting || !password}
                  onClick={() => void onExistingSignIn()}
                >
                  {submitting ? 'Signing in…' : 'Sign in'}
                </button>
              </>
            ) : !emailVerified ? (
              <>
                <ClerkCaptcha variant={codeSent ? 'compact' : 'default'} />
                {codeSent ? (
                  <>
                    {info ? <p className={styles.note}>{info}</p> : null}
                    <p className={styles.note} style={{ margin: 0 }}>
                      Enter the 6-digit code sent to <strong>{form.email}</strong>
                    </p>
                    <OtpInput
                      value={code}
                      onChange={setCode}
                      disabled={submitting}
                      status={otpStatus}
                    />
                    <button
                      className={styles.cta}
                      type="button"
                      disabled={submitting || code.replace(/\D/g, '').length < 6}
                      onClick={() => {
                        const otp = code.replace(/\D/g, '');
                        if (otp.length === 6) void verifyOtpCode(otp);
                      }}
                    >
                      {submitting ? 'Verifying…' : 'Verify code'}
                    </button>
                    <button
                      className={styles.linkBtn}
                      type="button"
                      disabled={submitting}
                      onClick={() => void onResendCode()}
                    >
                      Resend code
                    </button>
                  </>
                ) : (
                  <button
                    className={styles.cta}
                    type="button"
                    disabled={submitting || !isLoaded}
                    onClick={() => void onSendCode()}
                  >
                    {submitting ? 'Checking…' : 'Continue'}
                  </button>
                )}
              </>
            ) : (
              <>
                {info ? (
                  <p className={styles.note} role="status">
                    {info}
                  </p>
                ) : null}
                <label className={styles.field}>
                  <span>Set password</span>
                  <div className={styles.passwordWrap}>
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="Create a password"
                      required
                      disabled={submitting}
                    />
                    <button
                      type="button"
                      className={styles.eyeBtn}
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      <PasswordEyeIcon hidden={showPassword} />
                    </button>
                  </div>
                </label>
                <label className={styles.field}>
                  <span>Confirm password</span>
                  <div className={styles.passwordWrap}>
                    <input
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="Re-enter password"
                      required
                      disabled={submitting}
                    />
                    <button
                      type="button"
                      className={styles.eyeBtn}
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      <PasswordEyeIcon hidden={showConfirmPassword} />
                    </button>
                  </div>
                </label>
                <p className={styles.note}>{PASSWORD_HINT}</p>
                <button
                  className={styles.cta}
                  type="button"
                  disabled={submitting || !password || !confirmPassword}
                  onClick={() => void savePasswordAndEnterApp()}
                >
                  {submitting ? 'Saving…' : 'Save password and continue'}
                </button>
              </>
            )}

            {error ? (
              <p className={styles.error} role="alert">
                {error}
              </p>
            ) : null}

            {!emailVerified && !existingAccount ? (
              <p className={styles.note}>
                Already have an account? <Link to="/login">Sign in</Link>
              </p>
            ) : null}
          </form>
        </div>
      </main>
    </div>
  );
}
