import type { ReactNode } from 'react';

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

/** Cross-page empty placeholder (generalizes dashboard empty messaging). */
export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div
      role="status"
      style={{
        padding: '2rem 1.25rem',
        textAlign: 'center',
        maxWidth: 420,
        margin: '0 auto',
      }}
    >
      <h2 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem', fontWeight: 600 }}>{title}</h2>
      {description ? (
        <p style={{ margin: '0 0 1rem', opacity: 0.8, lineHeight: 1.5 }}>{description}</p>
      ) : null}
      {action}
    </div>
  );
}
