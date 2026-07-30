import type { ReactNode } from 'react';

type SpinnerProps = {
  label?: string;
  size?: 'sm' | 'md';
};

/** Shared loading indicator — prefer this over ad hoc "Loading…" strings. */
export default function Spinner({ label = 'Loading…', size = 'md' }: SpinnerProps): ReactNode {
  const dim = size === 'sm' ? 16 : 22;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.25rem 0',
        fontFamily: 'inherit',
        fontSize: size === 'sm' ? '0.875rem' : '1rem',
        color: 'inherit',
      }}
    >
      <span
        aria-hidden
        style={{
          width: dim,
          height: dim,
          borderRadius: '50%',
          border: '2px solid currentColor',
          borderRightColor: 'transparent',
          display: 'inline-block',
          animation: 'asktill-spin 0.7s linear infinite',
        }}
      />
      <span>{label}</span>
      <style>{`@keyframes asktill-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
