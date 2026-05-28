import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useClerk, useSignUp, useUser } from '@clerk/clerk-react';
import AuthNav from '../components/auth/AuthNav';
import AuthPageFooter from '../components/auth/AuthPageFooter';
import OtpInput, { type OtpInputStatus } from '../components/auth/OtpInput';
import ClerkCaptcha, { prepareClerkCaptcha } from '../components/auth/ClerkCaptcha';
import { useAuth } from '../context/AuthContext';
import { checkEmail, clerkCleanupUnregistered, getApiError, register as registerUser } from '../lib/api';
import {
  clearClerkSession,
  clerkErrorMessage,
  isClerkCaptchaError,
  clearGoogleSignInAttempt,
  formatClerkSignUpBlockers,
  consumeRegisterFromGoogle,
  GOOGLE_SIGNIN_NOT_REGISTERED_MSG,
  isClerkEnabled,
  wasGoogleSignInAttempt,
} from '../lib/clerk';
import { normalizeEmail, validateRegisterEmail } from '../lib/emailValidation';
import {
  REGISTRATION_ROLE_GROUPS,
  type RegistrationRole,
} from '../lib/registrationRoles';
import authFieldStyles from '../components/auth/EmailField.module.css';
import styles from './RegisterPage.module.css';

type RegisterStep = 0 | 1 | 2;
type OtpFeedback = 'none' | 'pending' | 'success' | 'error';

type DetailsFieldErrors = {
  fullName?: string;
  companyName?: string;
  role?: string;
  password?: string;
};

const OTP_SUCCESS_DELAY_MS = 750;

const DUPLICATE_ACCOUNT_MSG =
  'An account with this email already exists. Sign in instead.';

function OtpCheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M2.5 7.5L5.5 10.5L11.5 3.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function OtpCrossIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function validateDetailsForm(
  fullName: string,
  companyName: string,
  role: RegistrationRole | '',
  password: string,
): DetailsFieldErrors {
  const errors: DetailsFieldErrors = {};
  if (!fullName.trim()) errors.fullName = 'Enter your full name.';
  if (!companyName.trim()) errors.companyName = 'Enter your company name.';
  if (!role) errors.role = 'Select your role.';
  if (!password) errors.password = 'Enter a password.';
  else if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
  return errors;
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

function RegisterClerkFlow() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const clerk = useClerk();
  const { isLoaded, signUp } = useSignUp();
  const { user: clerkUser, isLoaded: clerkUserLoaded } = useUser();

  const [step, setStep] = useState<RegisterStep>(0);
  const [email, setEmail] = useState('');
  const [emailFieldError, setEmailFieldError] = useState('');
  const [code, setCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState<RegistrationRole | ''>('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<DetailsFieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpFeedback, setOtpFeedback] = useState<OtpFeedback>('none');
  const lastOtpAttemptRef = useRef('');
  const otpSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const googleCleanupDoneRef = useRef(false);

  useEffect(() => {
    return () => {
      if (otpSuccessTimerRef.current) clearTimeout(otpSuccessTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const flash = consumeRegisterFromGoogle();
    const state = location.state as {
      email?: string;
      registerMessage?: string;
      message?: string;
    } | null;
    const params = new URLSearchParams(location.search);
    const fromGoogle = flash?.email ?? state?.email ?? params.get('email') ?? '';
    const message =
      flash?.message ??
      state?.registerMessage ??
      state?.message ??
      (fromGoogle ? GOOGLE_SIGNIN_NOT_REGISTERED_MSG : '');
    if (fromGoogle) {
      setEmail(normalizeEmail(fromGoogle));
      if (message) setInfo(message);
      if (state?.email || state?.registerMessage || state?.message) {
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, location.search]);

  useEffect(() => {
    if (googleCleanupDoneRef.current) return;
    if (!wasGoogleSignInAttempt()) return;
    if (!clerkUserLoaded || !clerk.loaded || !clerk.session?.id) return;
    const isGoogleOAuth = clerkUser?.externalAccounts?.some(
      (account) => account.provider === 'google',
    );
    if (!isGoogleOAuth) return;

    const googleEmail = clerkUser?.primaryEmailAddress?.emailAddress;
    if (!googleEmail) return;

    googleCleanupDoneRef.current = true;
    const sessionId = clerk.session.id;
    const addr = normalizeEmail(googleEmail);

    void (async () => {
      try {
        const { data } = await checkEmail(addr);
        if (!data.registered) {
          setEmail(addr);
          setInfo(GOOGLE_SIGNIN_NOT_REGISTERED_MSG);
          clearGoogleSignInAttempt();
          await clearClerkSession(clerk, { stayOnPage: true });
          try {
            await clerkCleanupUnregistered(sessionId);
          } catch {
            /* best-effort */
          }
        }
      } catch {
        setEmail(addr);
        setInfo(GOOGLE_SIGNIN_NOT_REGISTERED_MSG);
        await clearClerkSession(clerk, { stayOnPage: true });
      }
    })();
  }, [clerk, clerk.loaded, clerk.session?.id, clerkUser, clerkUserLoaded]);

  useEffect(() => {
    if (step !== 0) return undefined;
    const validation = validateRegisterEmail(email);
    if (!validation.ok) {
      return undefined;
    }
    const addr = normalizeEmail(email);
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const { data } = await checkEmail(addr);
        if (cancelled) return;
        if (data.registered) {
          setEmailFieldError(data.message ?? DUPLICATE_ACCOUNT_MSG);
        } else {
          setEmailFieldError((prev) =>
            prev && prev.includes('already exists') ? '' : prev,
          );
        }
      } catch {
        /* ignore lookup errors — submit will re-check */
      }
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [email, step]);

  async function assertNewAccount(addr: string) {
    const { data } = await checkEmail(addr);
    if (data.registered) {
      throw new Error(data.message ?? DUPLICATE_ACCOUNT_MSG);
    }
  }

  async function deliverSignUpCode(addr: string, _resend: boolean) {
    await assertNewAccount(addr);
    await prepareClerkCaptcha();
    if (!signUp) throw new Error('Auth is still loading.');

    const clerkEmail = normalizeEmail(signUp.emailAddress || '');
    const emailChanged = Boolean(signUp.id && clerkEmail && clerkEmail !== addr);

    if (isEmailVerifiedInClerk(signUp) && !emailChanged && clerkEmail === addr) {
      return 'already_verified';
    }

    const tempPw = tempClerkPassword();

    if (!signUp.id) {
      await signUp.create({ emailAddress: addr });
      await satisfyClerkPassword(signUp, tempPw);
    } else if (emailChanged || !clerkEmail) {
      await signUp.update({ emailAddress: addr });
      await satisfyClerkPassword(signUp, tempPw);
      setEmailVerified(false);
      setCode('');
    }

    await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
    return 'sent';
  }

  async function handleVerifyEmail(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setInfo('');
    setEmailFieldError('');

    const validation = validateRegisterEmail(email);
    if (!validation.ok) {
      setEmailFieldError(validation.message ?? 'Enter a valid email address.');
      return;
    }
    const addr = normalizeEmail(email);
    if (!isLoaded || !signUp) {
      setError('Auth is still loading. Please wait and try again.');
      return;
    }
    if (emailFieldError) {
      return;
    }

    setLoading(true);
    try {
      const { data: emailCheck } = await checkEmail(addr);
      if (emailCheck.registered) {
        setEmailFieldError(emailCheck.message ?? DUPLICATE_ACCOUNT_MSG);
        setError('');
        return;
      }
      const result = await deliverSignUpCode(addr, false);
      setEmail(addr);
      setStep(1);
      if (result === 'already_verified') {
        setEmailVerified(true);
        setStep(2);
        setInfo('');
      } else {
        setInfo('We sent a 6-digit code to your email. Check your inbox and spam folder.');
      }
    } catch (err) {
      setError(clerkErrorMessage(err, 'Could not send verification email.'));
      if (isClerkCaptchaError(err)) setStep(0);
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    if (otpSuccessTimerRef.current) clearTimeout(otpSuccessTimerRef.current);
    setError('');
    setCode('');
    lastOtpAttemptRef.current = '';
    setOtpFeedback('none');
    setLoading(true);
    try {
      await deliverSignUpCode(email, true);
      setInfo('A new code was sent. Check spam if you do not see it.');
    } catch (err) {
      setError(clerkErrorMessage(err, 'Could not resend code.'));
    } finally {
      setLoading(false);
    }
  }

  function handleChangeEmail() {
    if (otpSuccessTimerRef.current) clearTimeout(otpSuccessTimerRef.current);
    setStep(0);
    setCode('');
    setError('');
    setInfo('');
    setEmailVerified(false);
    setOtpFeedback('none');
    lastOtpAttemptRef.current = '';
  }

  const verifyOtpCode = useCallback(
    async (otp: string) => {
      if (!isLoaded || !signUp) return;

      setLoading(true);
      setOtpFeedback('pending');
      setError('');
      try {
        const result = await signUp.attemptEmailAddressVerification({ code: otp });
        if (
          result.verifications?.emailAddress?.status === 'verified' ||
          signUp.verifications.emailAddress.status === 'verified'
        ) {
          setOtpFeedback('success');
          if (otpSuccessTimerRef.current) clearTimeout(otpSuccessTimerRef.current);
          otpSuccessTimerRef.current = setTimeout(() => {
            setEmailVerified(true);
            setInfo('');
            setStep(2);
            setOtpFeedback('none');
          }, OTP_SUCCESS_DELAY_MS);
          return;
        }
        throw new Error(formatClerkSignUpBlockers(signUp) ?? 'Invalid or expired code.');
      } catch (err) {
        setOtpFeedback('error');
        setError(clerkErrorMessage(err, 'Incorrect code. Please try again.'));
        setCode('');
        lastOtpAttemptRef.current = '';
      } finally {
        setLoading(false);
      }
    },
    [isLoaded, signUp],
  );

  function handleCodeChange(value: string) {
    setCode(value);
    if (otpFeedback !== 'none') setOtpFeedback('none');
    if (error) setError('');
    if (value.replace(/\D/g, '').length < 6) {
      lastOtpAttemptRef.current = '';
    }
  }

  const otpInputStatus: OtpInputStatus =
    otpFeedback === 'success' ? 'success' : otpFeedback === 'error' ? 'error' : 'default';

  useEffect(() => {
    if (step !== 1 || loading || !isLoaded || !signUp) return;
    const otp = code.replace(/\D/g, '');
    if (otp.length !== 6) return;
    if (lastOtpAttemptRef.current === otp) return;
    lastOtpAttemptRef.current = otp;
    void verifyOtpCode(otp);
  }, [code, step, loading, isLoaded, signUp, verifyOtpCode]);

  async function handleCreateAccount(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    if (!emailVerified) {
      setError('Verify your email with the 6-digit code first.');
      return;
    }

    const errors = validateDetailsForm(fullName, companyName, role, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError('Complete every field before creating your account.');
      return;
    }

    const addr = email.trim().toLowerCase();
    setLoading(true);
    try {
      await assertNewAccount(addr);
      await registerUser({
        email: addr,
        password,
        businessName: companyName.trim(),
        industry: role,
        country: 'US',
      });
      await login(addr, password);
      await clearClerkSession(clerk);
      navigate('/onboarding');
    } catch (err) {
      const axiosErr = err as { response?: { status?: number } };
      const message = getApiError(err, 'Could not create your account.');
      if (axiosErr.response?.status === 409 || /already exists/i.test(message)) {
        setError(DUPLICATE_ACCOUNT_MSG);
      } else if (/unexpected end of json input/i.test(message)) {
        setError(
          'Registration service did not respond correctly. Confirm the registration service is running on port 8003, then try again.',
        );
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  const detailsFormComplete =
    fullName.trim().length > 0 &&
    companyName.trim().length > 0 &&
    role !== '' &&
    password.length >= 8;

  return (
    <>
      <ClerkCaptcha variant={step >= 1 ? 'compact' : 'default'} />

      {info && step === 0 ? (
        <p className={styles.infoOk} role="status">
          {info}
        </p>
      ) : null}

      <div className={styles.steps}>
        {['Email', 'Verify', 'Details'].map((label, index) => (
          <div key={label} className={styles.stepItem}>
            <div className={`${styles.stepDot} ${index <= step ? styles.stepDotActive : ''}`}>
              {index < step ? '✓' : index + 1}
            </div>
            <span className={`${styles.stepLabel} ${index === step ? styles.stepLabelActive : ''}`}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {step === 0 ? (
        <form className={styles.form} onSubmit={handleVerifyEmail} noValidate>
          <h2 className={styles.stepTitle}>Your email</h2>
          <p className={styles.stepSub}>
            Use your work or personal email — we send a 6-digit verification code to confirm it
          </p>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="register-email">
              Email address
            </label>
            <input
              id="register-email"
              type="email"
              className={styles.input}
              placeholder="you@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailFieldError('');
                if (error) setError('');
              }}
              autoComplete="email"
              inputMode="email"
            />
            {emailFieldError ? <span className={styles.error}>{emailFieldError}</span> : null}
          </div>
          {error && !emailFieldError ? <div className={styles.error}>{error}</div> : null}
          <button
            type="submit"
            className={styles.submit}
            disabled={loading || !isLoaded || Boolean(emailFieldError)}
          >
            {loading ? 'Sending…' : 'Verify email →'}
          </button>
        </form>
      ) : null}

      {step === 1 ? (
        <div className={styles.form}>
          <h2 className={styles.stepTitle}>Enter verification code</h2>
          <p className={styles.stepSub}>
            6-digit code sent to <strong>{email}</strong> — we verify automatically when you finish typing
          </p>

          {info && otpFeedback === 'none' ? <p className={styles.info}>{info}</p> : null}
          <OtpInput
            value={code}
            onChange={handleCodeChange}
            disabled={loading || otpFeedback === 'success'}
            status={otpInputStatus}
          />
          {otpFeedback === 'pending' ? (
            <div className={`${styles.otpFeedback} ${styles.otpFeedbackPending}`} role="status">
              <span>Verifying code…</span>
            </div>
          ) : null}
          {otpFeedback === 'success' ? (
            <div
              className={`${styles.otpFeedback} ${styles.otpFeedbackSuccess}`}
              role="status"
              aria-live="polite"
            >
              <span className={`${styles.otpFeedbackIcon} ${styles.otpFeedbackIconSuccess}`}>
                <OtpCheckIcon />
              </span>
              <span>Code verified — taking you to your details…</span>
            </div>
          ) : null}
          {otpFeedback === 'error' ? (
            <div
              className={`${styles.otpFeedback} ${styles.otpFeedbackError}`}
              role="alert"
              aria-live="assertive"
            >
              <span className={`${styles.otpFeedbackIcon} ${styles.otpFeedbackIconError}`}>
                <OtpCrossIcon />
              </span>
              <span>{error || 'Incorrect code. Please try again.'}</span>
            </div>
          ) : null}
          <div className={styles.linkRow}>
            <button
              type="button"
              className={authFieldStyles.hintButton}
              onClick={handleResendCode}
              disabled={loading || otpFeedback === 'success'}
            >
              Resend code
            </button>
            <button
              type="button"
              className={authFieldStyles.hintButton}
              onClick={handleChangeEmail}
              disabled={loading || otpFeedback === 'success'}
            >
              Change email
            </button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <form className={styles.form} onSubmit={handleCreateAccount} noValidate>
          <h2 className={styles.stepTitle}>Your details</h2>
          <p className={styles.stepSub}>
            Account for <strong>{email}</strong>
          </p>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="fullName">
              Full name <span className={styles.requiredMark} aria-hidden>*</span>
            </label>
            <input
              id="fullName"
              className={styles.input}
              placeholder="Jane Smith"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (fieldErrors.fullName) {
                  setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
                }
              }}
              autoComplete="name"
              required
            />
            {fieldErrors.fullName ? (
              <span className={styles.error}>{fieldErrors.fullName}</span>
            ) : null}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="companyName">
              Company name <span className={styles.requiredMark} aria-hidden>*</span>
            </label>
            <input
              id="companyName"
              className={styles.input}
              placeholder="Your company"
              value={companyName}
              onChange={(e) => {
                setCompanyName(e.target.value);
                if (fieldErrors.companyName) {
                  setFieldErrors((prev) => ({ ...prev, companyName: undefined }));
                }
              }}
              required
            />
            {fieldErrors.companyName ? (
              <span className={styles.error}>{fieldErrors.companyName}</span>
            ) : null}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="role">
              Your role <span className={styles.requiredMark} aria-hidden>*</span>
            </label>
            <select
              id="role"
              className={styles.select}
              value={role}
              onChange={(e) => {
                setRole(e.target.value as RegistrationRole | '');
                if (fieldErrors.role) {
                  setFieldErrors((prev) => ({ ...prev, role: undefined }));
                }
              }}
              required
            >
              <option value="" disabled>
                Choose the role that best describes you
              </option>
              {REGISTRATION_ROLE_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.roles.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {fieldErrors.role ? <span className={styles.error}>{fieldErrors.role}</span> : null}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="register-password">
              Password <span className={styles.requiredMark} aria-hidden>*</span>
            </label>
            <div className={styles.passwordWrap}>
              <input
                id="register-password"
                name="register-password"
                type={showPassword ? 'text' : 'password'}
                className={styles.input}
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                autoComplete="new-password"
                minLength={8}
                required
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {fieldErrors.password ? (
              <span className={styles.error}>{fieldErrors.password}</span>
            ) : null}
          </div>

          {error ? <div className={styles.error}>{error}</div> : null}
          <button
            type="submit"
            className={styles.submit}
            disabled={loading || !detailsFormComplete}
          >
            {loading ? 'Creating account…' : 'Create account →'}
          </button>
        </form>
      ) : null}

      <AuthPageFooter
        variant="signup"
        showHomeLink={false}
        signInEmail={email ? normalizeEmail(email) : undefined}
      />
    </>
  );
}

export default function RegisterPage() {
  if (!isClerkEnabled()) {
    return (
      <div className={styles.page}>
        <AuthNav active="signup" />
        <main className={styles.main}>
          <div className={styles.card}>
            <p className={styles.error}>
              Clerk is not configured. Copy <code>VITE_CLERK_PUBLISHABLE_KEY</code> from the asktill folder into asktill-web <code>.env</code>.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <AuthNav active="signup" />
      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h1 className={styles.heading}>Create your <em>account</em></h1>
            <p className={styles.sub}>Create your account — verify your email, then enter your details</p>
          </div>
          <RegisterClerkFlow />
        </div>
      </main>
    </div>
  );
}
