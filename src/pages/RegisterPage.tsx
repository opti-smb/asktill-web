import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useClerk, useSignUp, useUser } from '@clerk/clerk-react';
import AuthNav from '../components/auth/AuthNav';
import AuthPageFooter from '../components/auth/AuthPageFooter';
import OtpInput, { type OtpInputStatus } from '../components/auth/OtpInput';
import ClerkCaptcha, { prepareClerkCaptcha } from '../components/auth/ClerkCaptcha';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import { useAuth } from '../context/AuthContext';
import { checkEmail, clerkCleanupUnregistered, getApiError, register as registerUser, warmupServices } from '../lib/api';
import { validatePassword } from '../lib/passwordPolicy';
import {
  clearRegisterDraft,
  loadRegisterDraft,
  saveRegisterDraft,
} from '../lib/registerDraft';
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
import authFieldStyles from '../components/auth/EmailField.module.css';
import styles from './RegisterPage.module.css';

type RegisterStep = 0 | 1 | 2;
type OtpFeedback = 'none' | 'pending' | 'success' | 'error';
type CreateAccountStep = 'idle' | 'registering' | 'signing-in';

type DetailsFieldErrors = {
  fullName?: string;
  companyName?: string;
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
  email: string,
  password: string,
): DetailsFieldErrors {
  const errors: DetailsFieldErrors = {};
  if (!fullName.trim()) errors.fullName = 'Enter your name.';
  if (!companyName.trim()) errors.companyName = 'Enter your company.';
  const passwordError = validatePassword(password, {
    email: email.trim().toLowerCase(),
    businessName: companyName.trim(),
    fullName: fullName.trim(),
  });
  if (passwordError) errors.password = passwordError;
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
  const [searchParams] = useSearchParams();
  const referralCodeRef = useRef(
    (searchParams.get('ref') || searchParams.get('referral') || '').trim().toUpperCase(),
  );
  const { login, isAuth, ready, logout } = useAuth();
  const clerk = useClerk();
  const { isLoaded, signUp } = useSignUp();
  const { user: clerkUser, isLoaded: clerkUserLoaded } = useUser();
  const referralSessionPreparedRef = useRef(false);

  const [step, setStep] = useState<RegisterStep>(0);
  const [email, setEmail] = useState('');
  const [emailFieldError, setEmailFieldError] = useState('');
  const [code, setCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<DetailsFieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [createStep, setCreateStep] = useState<CreateAccountStep>('idle');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpFeedback, setOtpFeedback] = useState<OtpFeedback>('none');
  const lastOtpAttemptRef = useRef('');
  const otpSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const googleCleanupDoneRef = useRef(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    warmupServices();
  }, []);

  useEffect(() => {
    if (!ready || !referralCodeRef.current) return;
    if (!isAuth || referralSessionPreparedRef.current) return;
    referralSessionPreparedRef.current = true;
    void (async () => {
      clearRegisterDraft();
      await logout();
      if (clerk.loaded) {
        await clearClerkSession(clerk, { stayOnPage: true });
      }
      setInfo('Signed out so you can create a new account with this referral link.');
    })();
  }, [ready, isAuth, logout, clerk]);

  useEffect(() => {
    if (ready && isAuth && !referralCodeRef.current) {
      clearRegisterDraft();
      navigate('/onboarding', { replace: true });
    }
  }, [ready, isAuth, navigate]);

  useEffect(() => {
    const draft = loadRegisterDraft();
    if (!draft) return;
    setEmail((current) => current || draft.email);
    setStep(draft.step);
    setEmailVerified(draft.emailVerified);
    setFullName((current) => current || draft.fullName);
    setCompanyName((current) => current || draft.companyName);
  }, []);

  useEffect(() => {
    if (!email.trim()) return;
    saveRegisterDraft({
      email: normalizeEmail(email),
      step,
      emailVerified,
      fullName,
      companyName,
    });
  }, [email, step, emailVerified, fullName, companyName]);

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
        setInfo('');
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
      setInfo('');
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
    if (step !== 2) return undefined;

    const syncPasswordFromDom = () => {
      const el = passwordInputRef.current;
      if (!el?.value) return;
      setPassword((prev) => (prev === el.value ? prev : el.value));
    };

    syncPasswordFromDom();
    const timers = [0, 100, 300, 600].map((delay) =>
      window.setTimeout(syncPasswordFromDom, delay),
    );
    const el = passwordInputRef.current;
    el?.addEventListener('change', syncPasswordFromDom);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      el?.removeEventListener('change', syncPasswordFromDom);
    };
  }, [step, fullName, companyName, email]);

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

    const errors = validateDetailsForm(fullName, companyName, email, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError('Complete every field before creating your account.');
      return;
    }

    const addr = email.trim().toLowerCase();
    setLoading(true);
    setCreateStep('registering');
    try {
      await registerUser({
        email: addr,
        password,
        businessName: companyName.trim(),
        fullName: fullName.trim(),
        country: 'US',
        ...(referralCodeRef.current ? { referralCode: referralCodeRef.current } : {}),
      });
      setCreateStep('signing-in');
      await login(addr, password);
      clearRegisterDraft();
      navigate('/onboarding');
      void clearClerkSession(clerk);
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
      setCreateStep('idle');
    }
  }

  const createAccountLabel =
    createStep === 'registering'
      ? 'Creating account…'
      : createStep === 'signing-in'
        ? 'Signing you in…'
        : 'Create account →';

  const passwordContext = {
    email: email.trim().toLowerCase(),
    businessName: companyName.trim(),
    fullName: fullName.trim(),
  };
  const passwordValidationError = password ? validatePassword(password, passwordContext) : null;

  const detailsFormComplete =
    fullName.trim().length > 0 &&
    companyName.trim().length > 0 &&
    passwordValidationError === null;

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
        <>
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
          <div className={styles.divider}>or continue with Google</div>
          <GoogleSignInButton mode="signup" disabled={loading} onError={setError} />
        </>
      ) : null}

      {step === 1 ? (
        <div className={styles.form}>
          <h2 className={styles.stepTitle}>Enter verification code</h2>
          <p className={styles.stepSub}>
            6-digit code sent to <strong>{email}</strong>
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
              Name <span className={styles.requiredMark} aria-hidden>*</span>
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
              Company <span className={styles.requiredMark} aria-hidden>*</span>
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
            <label className={styles.label} htmlFor="register-password">
              Password <span className={styles.requiredMark} aria-hidden>*</span>
            </label>
            <div className={styles.passwordWrap}>
              <input
                id="register-password"
                name="register-password"
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                className={styles.input}
                placeholder="Strong password required"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                onInput={(e) => {
                  setPassword(e.currentTarget.value);
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
            {fieldErrors.password || passwordValidationError ? (
              <span className={styles.error}>
                {fieldErrors.password ?? passwordValidationError}
              </span>
            ) : null}
          </div>

          {error ? <div className={styles.error}>{error}</div> : null}
          {loading && createStep !== 'idle' ? (
            <p className={styles.info} role="status">
              {createStep === 'registering'
                ? 'Setting up your account…'
                : 'Almost done — signing you in…'}
            </p>
          ) : null}
          <button
            type="submit"
            className={styles.submit}
            disabled={loading || !detailsFormComplete}
          >
            {loading ? createAccountLabel : 'Create account →'}
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
