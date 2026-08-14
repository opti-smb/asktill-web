import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import AuthNav from '../components/auth/AuthNav';
import AuthPageFooter from '../components/auth/AuthPageFooter';
import EmailField from '../components/auth/EmailField';
import OtpInput, { type OtpInputStatus } from '../components/auth/OtpInput';
import {
  checkEmail,
  forgotPasswordReset,
  forgotPasswordSendCode,
  forgotPasswordVerifyCode,
  getApiError,
} from '../lib/api';
import { emailFieldRules, normalizeEmail } from '../lib/emailValidation';
import { PASSWORD_HINT, validatePassword } from '../lib/passwordPolicy';
import { isPublicBetaGateActive } from '../lib/publicBetaGate';
import authFieldStyles from '../components/auth/EmailField.module.css';
import registerStyles from './RegisterPage.module.css';
import loginStyles from './LoginPage.module.css';
import BetaAccessPage from './BetaAccessPage';

type Step = 0 | 1 | 2;
type OtpFeedback = 'none' | 'pending' | 'success' | 'error';

const OTP_SUCCESS_DELAY_MS = 750;

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

interface EmailForm {
  email: string;
}

/**
 * Forgot password via Auth Service OTP — writes the same passwordHash used by email login.
 * (Clerk-only reset left users able to reset in Clerk without updating AskTill login.)
 */
function ForgotPasswordAuthFlow() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(0);
  const [savedEmail, setSavedEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [otpFeedback, setOtpFeedback] = useState<OtpFeedback>('none');
  const lastOtpAttemptRef = useRef('');
  const otpSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EmailForm>();
  const emailValue = watch('email') ?? '';

  useEffect(() => {
    return () => {
      if (otpSuccessTimerRef.current) clearTimeout(otpSuccessTimerRef.current);
    };
  }, []);

  const sendResetCode = useCallback(async (addr: string) => {
    const { data: emailCheck } = await checkEmail(addr);
    if (!emailCheck.registered) {
      throw new Error(emailCheck.message ?? 'No account for this email. Please register first.');
    }
    const { data } = await forgotPasswordSendCode(addr);
    return data;
  }, []);

  const handleSendCode = async (data: EmailForm) => {
    setError('');
    setInfo('');
    const addr = normalizeEmail(data.email);

    setLoading(true);
    try {
      const result = await sendResetCode(addr);
      setSavedEmail(addr);
      setInfo(
        result.devCode
          ? `${result.message} Dev code: ${result.devCode}`
          : result.message || 'We sent a 6-digit code to your email.',
      );
      setStep(1);
    } catch (err) {
      setError(getApiError(err, 'Could not send reset code.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!savedEmail) return;
    setError('');
    setInfo('');
    setCode('');
    lastOtpAttemptRef.current = '';
    setOtpFeedback('none');
    setLoading(true);
    try {
      const result = await sendResetCode(savedEmail);
      setInfo(
        result.devCode
          ? `A new code was sent. Dev code: ${result.devCode}`
          : 'A new code was sent. Check spam if you do not see it.',
      );
    } catch (err) {
      setError(getApiError(err, 'Could not resend code.'));
    } finally {
      setLoading(false);
    }
  };

  const verifyOtpCode = useCallback(
    async (otp: string) => {
      setLoading(true);
      setOtpFeedback('pending');
      setError('');
      try {
        const { data } = await forgotPasswordVerifyCode(savedEmail, otp);
        if (!data.resetToken) {
          throw new Error('Invalid or expired code.');
        }
        setResetToken(data.resetToken);
        setOtpFeedback('success');
        if (otpSuccessTimerRef.current) clearTimeout(otpSuccessTimerRef.current);
        otpSuccessTimerRef.current = setTimeout(() => {
          setInfo('');
          setStep(2);
          setOtpFeedback('none');
        }, OTP_SUCCESS_DELAY_MS);
      } catch (err) {
        setOtpFeedback('error');
        setError(getApiError(err, 'Incorrect code. Please try again.'));
        setCode('');
        lastOtpAttemptRef.current = '';
      } finally {
        setLoading(false);
      }
    },
    [savedEmail],
  );

  function handleCodeChange(value: string) {
    setCode(value);
    if (otpFeedback !== 'none') setOtpFeedback('none');
    if (error) setError('');
    if (value.replace(/\D/g, '').length < 6) {
      lastOtpAttemptRef.current = '';
    }
  }

  useEffect(() => {
    if (step !== 1 || loading || !savedEmail) return;
    const otp = code.replace(/\D/g, '');
    if (otp.length !== 6) return;
    if (lastOtpAttemptRef.current === otp) return;
    lastOtpAttemptRef.current = otp;
    void verifyOtpCode(otp);
  }, [code, step, loading, savedEmail, verifyOtpCode]);

  const otpInputStatus: OtpInputStatus =
    otpFeedback === 'success' ? 'success' : otpFeedback === 'error' ? 'error' : 'default';

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const policyError = validatePassword(password, { email: savedEmail });
    if (policyError) {
      setError(policyError);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!resetToken) {
      setError('Reset session expired. Request a new code.');
      setStep(0);
      return;
    }

    setLoading(true);
    try {
      const { data } = await forgotPasswordReset(resetToken, password);
      navigate('/login', {
        replace: true,
        state: {
          success: data.message ?? 'Password updated. Sign in with your new password.',
          email: savedEmail,
        },
      });
    } catch (err) {
      setError(getApiError(err, 'Could not update password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={registerStyles.cardHeader}>
        <h1 className={registerStyles.heading}>
          Reset your <em>password</em>
        </h1>
        <p className={registerStyles.sub}>
          {step === 0 && 'Enter your email — we’ll send a 6-digit code to your inbox.'}
          {step === 1 && `Enter the code sent to ${savedEmail}.`}
          {step === 2 && 'Choose a new password for your account.'}
        </p>
      </div>

      <div className={registerStyles.steps}>
        {['Email', 'Verify', 'Password'].map((label, index) => (
          <div key={label} className={registerStyles.stepItem}>
            <div
              className={`${registerStyles.stepDot} ${index <= step ? registerStyles.stepDotActive : ''}`}
            >
              {index < step ? '✓' : index + 1}
            </div>
            <span
              className={`${registerStyles.stepLabel} ${index === step ? registerStyles.stepLabelActive : ''}`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {error && otpFeedback !== 'error' ? <div className={registerStyles.error}>{error}</div> : null}
      {info && otpFeedback === 'none' && !error ? <p className={registerStyles.info}>{info}</p> : null}

      {step === 0 ? (
        <form className={registerStyles.form} onSubmit={handleSubmit(handleSendCode)} noValidate>
          <EmailField
            label="Email"
            registration={register('email', emailFieldRules())}
            error={errors.email}
            emailValue={emailValue}
            onApplySuggestion={(value) =>
              setValue('email', value, { shouldValidate: true, shouldDirty: true })
            }
            onEmailChange={() => setError('')}
          />
          <button type="submit" className={registerStyles.submit} disabled={loading}>
            {loading ? 'Sending…' : 'Send reset code'}
          </button>
        </form>
      ) : null}

      {step === 1 ? (
        <div className={registerStyles.form}>
          <div className={registerStyles.field}>
            <label className={registerStyles.label}>6-digit code</label>
            <OtpInput
              value={code}
              onChange={handleCodeChange}
              disabled={loading || otpFeedback === 'success'}
              status={otpInputStatus}
            />
          </div>
          {otpFeedback === 'pending' ? (
            <div className={`${registerStyles.otpFeedback} ${registerStyles.otpFeedbackPending}`} role="status">
              <span>Verifying code…</span>
            </div>
          ) : null}
          {otpFeedback === 'success' ? (
            <div
              className={`${registerStyles.otpFeedback} ${registerStyles.otpFeedbackSuccess}`}
              role="status"
            >
              <span className={`${registerStyles.otpFeedbackIcon} ${registerStyles.otpFeedbackIconSuccess}`}>
                <OtpCheckIcon />
              </span>
              <span>Code verified — choose your new password…</span>
            </div>
          ) : null}
          {otpFeedback === 'error' ? (
            <div className={`${registerStyles.otpFeedback} ${registerStyles.otpFeedbackError}`} role="alert">
              <span className={`${registerStyles.otpFeedbackIcon} ${registerStyles.otpFeedbackIconError}`}>
                <OtpCrossIcon />
              </span>
              <span>{error || 'Incorrect code. Please try again.'}</span>
            </div>
          ) : null}
          <div className={registerStyles.linkRow}>
            <button type="button" disabled={loading} onClick={() => void handleResendCode()}>
              Resend code
            </button>
            <button
              type="button"
              onClick={() => {
                setStep(0);
                setCode('');
                setResetToken('');
                setError('');
                setInfo('');
                setOtpFeedback('none');
                lastOtpAttemptRef.current = '';
              }}
            >
              Change email
            </button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <form className={registerStyles.form} onSubmit={handleResetPassword} noValidate>
          <div className={registerStyles.field}>
            <label className={registerStyles.label} htmlFor="new-password">
              New password
            </label>
            <div className={loginStyles.inputWrap}>
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                className={authFieldStyles.input}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className={loginStyles.eyeBtn}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className={registerStyles.info}>{PASSWORD_HINT}</p>
          </div>
          <div className={registerStyles.field}>
            <label className={registerStyles.label} htmlFor="confirm-password">
              Confirm password
            </label>
            <input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              className={authFieldStyles.input}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <button type="submit" className={registerStyles.submit} disabled={loading}>
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      ) : null}

      <p className={registerStyles.info} style={{ marginTop: 20, textAlign: 'center' }}>
        Remember your password? <Link to="/login">Back to sign in</Link>
      </p>
    </>
  );
}

export default function ForgotPasswordPage() {
  if (isPublicBetaGateActive()) {
    return <BetaAccessPage navActive="signin" />;
  }

  return (
    <div className={registerStyles.page}>
      <AuthNav active="signin" />
      <main className={registerStyles.main}>
        <div className={registerStyles.card}>
          <ForgotPasswordAuthFlow />
          <AuthPageFooter variant="signin" />
        </div>
      </main>
    </div>
  );
}
