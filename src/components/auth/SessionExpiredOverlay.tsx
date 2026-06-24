import { useNavigate } from 'react-router-dom';

import styles from './SessionExpiredOverlay.module.css';

interface SessionExpiredOverlayProps {
  returnTo: string;
}

export default function SessionExpiredOverlay({ returnTo }: SessionExpiredOverlayProps) {
  const navigate = useNavigate();

  return (
    <div className={styles.backdrop} role="presentation">
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-expired-title"
        aria-describedby="session-expired-desc"
      >
        <h2 id="session-expired-title" className={styles.title}>
          Session ended
        </h2>
        <p id="session-expired-desc" className={styles.message}>
          Your session ended. Sign in again to continue where you left off.
        </p>
        <button
          type="button"
          className={styles.primaryBtn}
          autoFocus
          onClick={() => navigate('/login', { state: { from: returnTo } })}
        >
          Sign in again
        </button>
      </div>
    </div>
  );
}
