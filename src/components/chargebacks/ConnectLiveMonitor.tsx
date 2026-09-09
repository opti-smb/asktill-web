import styles from './ConnectLiveMonitor.module.css';

export type LiveStamp = {
  label: string;
  at?: string | null;
};

function formatStamp(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function ConnectLiveMonitor({ stamps }: { stamps: LiveStamp[] }) {
  return (
    <div className={styles.wrap} aria-live="polite">
      <span className={styles.live}>
        <span className={styles.dot} aria-hidden />
        Live
      </span>
      <div className={styles.stamps}>
        {stamps.map((stamp) => (
          <div key={stamp.label} className={styles.item}>
            <span className={styles.label}>{stamp.label}</span>
            <span className={styles.value}>{formatStamp(stamp.at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
