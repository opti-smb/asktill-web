import { useEffect, useState } from 'react';
import AtHelpPanel from '../help/AtHelpPanel';
import { useDismissOnEscape } from '../../hooks/useDismissOnEscape';
import styles from './FloatingAskButton.module.css';

/**
 * Floating AT Help drawer — Raise an Issue UI from Agents Service.
 */
export default function FloatingAskButton() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useDismissOnEscape(() => setOpen(false), open);

  return (
    <>
      {open ? (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Close AT Help"
          onClick={() => setOpen(false)}
        />
      ) : null}

      {mounted ? (
        <div
          className={styles.drawer}
          role="dialog"
          aria-label="AT Help"
          hidden={!open}
          aria-hidden={!open}
        >
          <AtHelpPanel onClose={() => setOpen(false)} />
        </div>
      ) : null}

      <button
        type="button"
        className={`${styles.askFloating} ${open ? styles.askFloatingActive : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Close AT Help' : 'AT Help'}
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
        {open ? 'Close' : 'AT Help'}
      </button>
    </>
  );
}
