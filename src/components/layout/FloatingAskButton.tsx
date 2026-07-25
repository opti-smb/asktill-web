import { useEffect, useState } from 'react';
import AskChatPanel from '../analysis/AskChatPanel';
import styles from './FloatingAskButton.module.css';

/**
 * Floating Ask drawer. Panel stays mounted while closed so chat history
 * (from ChatContext) and draft input survive open/close within the session.
 */
export default function FloatingAskButton() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      {open ? (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Close chat"
          onClick={() => setOpen(false)}
        />
      ) : null}

      {mounted ? (
        <div
          className={styles.drawer}
          role="dialog"
          aria-label="Ask AskTill"
          hidden={!open}
          aria-hidden={!open}
        >
          <AskChatPanel variant="drawer" onClose={() => setOpen(false)} />
        </div>
      ) : null}

      <button
        type="button"
        className={`${styles.askFloating} ${open ? styles.askFloatingActive : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Close chat' : 'Ask anything'}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
        {open ? 'Close' : 'Ask anything'}
      </button>
    </>
  );
}
