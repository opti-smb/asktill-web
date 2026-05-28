import styles from './AuthOAuthProgress.module.css';

type Props = {
  title: string;
  hint?: string;
};

/** Centered loading state for Google OAuth handoff screens. */
export default function AuthOAuthProgress({ title, hint }: Props) {
  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <div className={styles.spinner} aria-hidden />
      <h1 className={styles.title}>{title}</h1>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
    </div>
  );
}
