import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import Logo from '../components/common/Logo';
import styles from './SignupPage.module.css';

interface SignupFormData {
  email: string;
  phone: string;
}

export default function SignupPage() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>();

  const onSubmit = async (data: SignupFormData) => {
    // Simulate brief async (replace with real API call)
    await new Promise((r) => setTimeout(r, 600));
    console.log('Signup:', data);
    setSubmitted(true);
    setTimeout(() => navigate('/onboarding'), 1200);
  };

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className="wrap">
          <Link to="/">
            <Logo size={28} />
          </Link>
        </div>
      </nav>

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.pill}>Private pilot · 100 spots</span>
            <h1 className={styles.heading}>
              Apply to <em>AskTill</em>
            </h1>
            <p className={styles.sub}>
              Free analytics, forever. We'll send your access link as soon as your spot is confirmed.
            </p>
          </div>

          {submitted ? (
            <div className={styles.success}>
              <div className={styles.successIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className={styles.successText}>You're on the list — redirecting…</p>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="email">
                  Business email
                </label>
                <input
                  id="email"
                  type="email"
                  className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                  placeholder="you@yourbusiness.com"
                  autoComplete="email"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Enter a valid email address',
                    },
                  })}
                />
                {errors.email && (
                  <span className={styles.error}>{errors.email.message}</span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="phone">
                  Mobile number
                </label>
                <input
                  id="phone"
                  type="tel"
                  className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
                  placeholder="+1 (555) 000-0000"
                  autoComplete="tel"
                  {...register('phone', {
                    required: 'Phone number is required',
                    pattern: {
                      value: /^[+\d][\d\s\-().]{7,}$/,
                      message: 'Enter a valid phone number',
                    },
                  })}
                />
                {errors.phone && (
                  <span className={styles.error}>{errors.phone.message}</span>
                )}
              </div>

              <button
                type="submit"
                className={styles.submit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving your spot…' : 'Apply for the pilot →'}
              </button>

              <p className={styles.legal}>
                No card required. We'll only use your number for onboarding support.
              </p>
            </form>
          )}
        </div>

        <div className={styles.trustRow}>
          <span className={styles.trustItem}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Bank-level encryption
          </span>
          <span className={styles.trustItem}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Takes 2 minutes
          </span>
          <span className={styles.trustItem}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M22 4L12 14.01l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Free forever
          </span>
        </div>
      </main>
    </div>
  );
}
