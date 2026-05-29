import styles from './ClerkCaptcha.module.css';

/** Clerk Turnstile mounts here — must stay in the DOM for the whole sign-up / reset flow. */
export const CLERK_CAPTCHA_ELEMENT_ID = 'clerk-captcha';

type ClerkCaptchaProps = {
  /** Shorter hint on OTP step when only resend may trigger a check. */
  variant?: 'default' | 'compact';
};

export default function ClerkCaptcha({ variant = 'default' }: ClerkCaptchaProps) {
  return (
    <div className={styles.wrap} aria-live="polite">
      <div
        id={CLERK_CAPTCHA_ELEMENT_ID}
        data-cl-theme="light"
        data-cl-size="flexible"
        data-cl-language="en-US"
      />
      {variant === 'compact' ? (
        <p className={styles.hint}>
          If a security check appears, complete it before resending your code.
        </p>
      ) : null}
    </div>
  );
}

/** Returns the captcha mount node (must exist via <ClerkCaptcha /> on the page). */
export function ensureClerkCaptchaContainer(): HTMLElement {
  const el = document.getElementById(CLERK_CAPTCHA_ELEMENT_ID);
  if (!el) {
    throw new Error('Security check is not ready. Refresh the page and try again.');
  }
  return el;
}

/** Give Turnstile a frame to bind before Clerk sends the verification email. */
export async function prepareClerkCaptcha(): Promise<HTMLElement> {
  const el = ensureClerkCaptchaContainer();
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  return el;
}
