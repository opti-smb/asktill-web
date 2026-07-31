type ErrorBannerProps = {
  message: string;
  onDismiss?: () => void;
};

/** Shared API/form error strip. */
export default function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  if (!message.trim()) return null;
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        borderRadius: 8,
        background: '#fef2f2',
        color: '#991b1b',
        border: '1px solid #fecaca',
        marginBottom: '1rem',
        fontSize: '0.925rem',
        lineHeight: 1.4,
      }}
    >
      <span style={{ flex: 1 }}>{message}</span>
      {onDismiss ? (
        <button
          type="button"
          aria-label="Dismiss error"
          onClick={onDismiss}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: '1.1rem',
            lineHeight: 1,
            color: 'inherit',
          }}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
