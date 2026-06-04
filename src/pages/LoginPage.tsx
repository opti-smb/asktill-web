import { useEffect, useRef, useState } from 'react';

import { Link, useLocation, useNavigate } from 'react-router-dom';

import { Controller, useForm } from 'react-hook-form';

import AuthNav from '../components/auth/AuthNav';

import AuthPageFooter from '../components/auth/AuthPageFooter';

import EmailField, { focusEmailInput } from '../components/auth/EmailField';

import GoogleSignInButton from '../components/auth/GoogleSignInButton';

import { useAuth } from '../context/AuthContext';

import { extractNotRegistered, getApiError, warmupAuthServiceReady } from '../lib/api';

import { consumeLoginFlash, isClerkEnabled } from '../lib/clerk';

import { emailFieldRules, isLoginEmailFailure } from '../lib/emailValidation';

import authFieldStyles from '../components/auth/EmailField.module.css';

import styles from './LoginPage.module.css';



interface LoginFormData {

  email: string;

  password: string;

}



export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuth, ready } = useAuth();
  const clerkOn = isClerkEnabled();

  const [showPassword, setShowPassword] = useState(false);

  const [serverError, setServerError] = useState('');

  const [emailHighlight, setEmailHighlight] = useState(false);



  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    defaultValues: { email: '', password: '' },
  });

  const emailValue = watch('email') ?? '';
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);

  const passwordRules = {
    required: 'Password is required',
    minLength: {
      value: 8,
      message: 'Password must be at least 8 characters',
    },
  } as const;

  useEffect(() => {
    void warmupAuthServiceReady();
  }, []);

  useEffect(() => {
    if (ready && isAuth) {
      const state = location.state as { from?: string } | null;
      const redirectTo = state?.from ?? '/onboarding';
      navigate(redirectTo, { replace: true });
    }
  }, [ready, isAuth, navigate, location.state]);

  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const flash = consumeLoginFlash();
    const state = location.state as {
      email?: string;
      error?: string;
      success?: string;
    } | null;

    const prefilledEmail = state?.email?.trim().toLowerCase() ?? '';
    reset({ email: prefilledEmail, password: '' });
    setShowPassword(false);
    setShowPasswordInput(false);

    const revealTimer = window.setTimeout(() => setShowPasswordInput(true), 50);
    const clearTimer = window.setTimeout(() => {
      setValue('password', '');
      if (passwordInputRef.current) passwordInputRef.current.value = '';
    }, 120);

    if (flash?.error || state?.error) {
      setServerError(flash?.error ?? state?.error ?? '');
      setSuccessMessage('');
    }
    if (state?.success) {
      setSuccessMessage(state.success);
      setServerError('');
    }
    if (state?.error || state?.success) {
      window.history.replaceState({}, document.title);
    }

    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(clearTimer);
    };
  }, [location.pathname, location.key, reset, setValue]);



  const onSubmit = async (data: LoginFormData) => {

    setServerError('');

    setEmailHighlight(false);

    const email = data.email.trim().toLowerCase();



    try {
      await login(email, data.password);

      const redirectTo = (location.state as { from?: string } | null)?.from ?? '/onboarding';

      navigate(redirectTo);

    } catch (err) {

      const notRegistered = extractNotRegistered(err);

      if (notRegistered) {

        setServerError(notRegistered.message);

        setEmailHighlight(true);

        focusEmailInput('login-email');

        return;

      }

      if (isLoginEmailFailure(err)) {

        setServerError(

          "We couldn't sign in with that email. Check for typos in the address or domain, then try again.",

        );

        setEmailHighlight(true);

        focusEmailInput('login-email');

      } else {

        setServerError(getApiError(err, 'Sign in failed.'));

      }

    }

  };



  return (
    <div className={styles.page}>
      <AuthNav active="signin" />



      <main className={styles.main}>

        <div className={styles.card}>

          <div className={styles.cardHeader}>

            <h1 className={styles.heading}>

              Welcome <em>back</em>

            </h1>

            <p className={styles.sub}>Sign in to your AskTill account.</p>

          </div>



          <form
            key={`login-${location.key}`}
            className={styles.form}
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            autoComplete="off"
          >

            <EmailField
              id="login-email"
              label="Email"
              autoComplete="username"
              registration={register('email', emailFieldRules())}

              error={errors.email}

              emailValue={emailValue}

              highlight={emailHighlight}

              onApplySuggestion={(email) => {

                setValue('email', email, { shouldValidate: true, shouldDirty: true });

              }}

              onEmailChange={() => {

                setEmailHighlight(false);

                setServerError('');

              }}

            />



            <div className={styles.field}>

              <div className={styles.labelRow}>

                <label className={styles.label} htmlFor="login-password">

                  Password

                </label>

                <Link to="/forgot-password" className={styles.forgotLink}>

                  Forgot password?

                </Link>

              </div>

              <div className={styles.inputWrap}>

                {showPasswordInput ? (
                  <Controller
                    name="password"
                    control={control}
                    rules={passwordRules}
                    render={({ field }) => (
                      <input
                        id="login-password"
                        name="login-password"
                        ref={(node) => {
                          field.ref(node);
                          passwordInputRef.current = node;
                        }}
                        type={showPassword ? 'text' : 'password'}
                        className={`${styles.input} ${styles.inputWithIcon} ${errors.password ? styles.inputError : ''}`}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        value={field.value ?? ''}
                        onChange={(event) => field.onChange(event.target.value)}
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                ) : (
                  <input
                    id="login-password"
                    name="login-password"
                    type="password"
                    className={`${styles.input} ${styles.inputWithIcon}`}
                    placeholder="••••••••"
                    autoComplete="off"
                    value=""
                    readOnly
                    tabIndex={-1}
                    aria-hidden
                  />
                )}

                <button

                  type="button"

                  className={styles.eyeBtn}

                  onClick={() => setShowPassword((v) => !v)}

                  aria-label={showPassword ? 'Hide password' : 'Show password'}

                >

                  {showPassword ? (

                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">

                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

                      <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

                    </svg>

                  ) : (

                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">

                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />

                    </svg>

                  )}

                </button>

              </div>

              {errors.password && (

                <span className={styles.error}>{errors.password.message}</span>

              )}

            </div>



            {successMessage ? (
              <div className={styles.serverSuccess}>{successMessage}</div>
            ) : null}

            {serverError ? (
              <div className={styles.serverError}>
                {serverError}
                {emailHighlight ? (
                  <div className={authFieldStyles.hint} style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      className={authFieldStyles.hintButton}
                      onClick={() => focusEmailInput('login-email')}
                    >
                      Edit email address
                    </button>
                    {' · '}
                    <Link to="/register" className={authFieldStyles.hintButton}>
                      Register first
                    </Link>
                  </div>
                ) : null}
              </div>
            ) : null}



            <button

              type="submit"

              className={styles.submit}

              disabled={isSubmitting}

            >

              {isSubmitting ? 'Signing in…' : 'Sign in →'}

            </button>

          </form>



          {clerkOn ? (
            <>
              <div className={styles.divider}>or continue with Google</div>
              <GoogleSignInButton
                disabled={isSubmitting}
                onError={setServerError}
              />
            </>
          ) : null}



          <AuthPageFooter variant="signin" />

        </div>

      </main>

    </div>

  );

}


