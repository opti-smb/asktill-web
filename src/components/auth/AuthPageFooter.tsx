import { Link } from 'react-router-dom';
import styles from './AuthPageFooter.module.css';

type AuthPageFooterVariant = 'signin' | 'signup';

const COPY: Record<
  AuthPageFooterVariant,
  { lead: string; primary: { label: string; to: string } }
> = {
  signin: {
    lead: 'Not registered yet?',
    primary: { label: 'Sign up', to: '/register' },
  },
  signup: {
    lead: 'Already have an account?',
    primary: { label: 'Sign in', to: '/login' },
  },
};

export default function AuthPageFooter({
  variant,
  showHomeLink = true,
  signInEmail,
  hidePrimary = false,
}: {
  variant: AuthPageFooterVariant;
  showHomeLink?: boolean;
  /** Prefill sign-in email when leaving registration (never pass password). */
  signInEmail?: string;
  /** Hide the Sign up / Sign in cross-link (e.g. login offers Create account only after failure). */
  hidePrimary?: boolean;
}) {
  const { lead, primary } = COPY[variant];
  const signInState =
    variant === 'signup' && signInEmail
      ? { email: signInEmail.trim().toLowerCase() }
      : undefined;

  return (
    <footer className={styles.footer}>
      {!hidePrimary ? (
        <>
          <p className={styles.lead}>{lead}</p>
          <div className={styles.links}>
            <Link to={primary.to} state={signInState} className={styles.primary}>
              {primary.label}
            </Link>
          </div>
        </>
      ) : null}
      {showHomeLink ? (
        <Link to="/" className={styles.home}>
          ← Back to home
        </Link>
      ) : null}
    </footer>
  );
}
