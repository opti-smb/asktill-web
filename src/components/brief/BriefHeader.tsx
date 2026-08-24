import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './BriefHeader.module.css';

type Props = {
  periodLabel: string;
  healthScore: number | null;
  healthDelta: number | null;
  healthDeltaDown?: boolean;
  healthPrevLabel: string | null;
  /** Band label from calculator health (e.g. "Stable — watch items"). */
  healthCaption?: string | null;
  monthOnly: boolean;
  monthFilterLabel: string;
  showViewFilters: boolean;
  viewMeta?: string | null;
  footerMeta?: string | null;
  loadStatus?: string | null;
  rollingError?: string | null;
  rollingLoading?: boolean;
  onSelectRolling: () => void;
  onSelectMonth: () => void;
  onHoverRolling?: () => void;
  onHoverMonth?: () => void;
  onFilterMouseLeave?: () => void;
};

function greetingForNow(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Prefer stored personal name; never use business name for greetings. */
function greetingName(
  fullName: string | null | undefined,
  email: string | null | undefined,
): string {
  const personal = fullName?.trim();
  if (personal) return personal.split(/\s+/)[0]!;
  const local = email?.trim().split('@')[0]?.trim();
  if (local) return local;
  return 'there';
}

export default function BriefHeader({
  periodLabel,
  healthScore,
  healthDelta,
  healthDeltaDown = false,
  healthPrevLabel,
  healthCaption = null,
  monthOnly,
  monthFilterLabel,
  showViewFilters,
  viewMeta,
  footerMeta,
  loadStatus,
  rollingError,
  rollingLoading,
  onSelectRolling,
  onSelectMonth,
  onHoverRolling,
  onHoverMonth,
  onFilterMouseLeave,
}: Props) {
  const { user } = useAuth();
  const name = greetingName(user?.name, user?.email);
  const scorePct = Math.max(0, Math.min(100, healthScore ?? 0));
  const ring = 2 * Math.PI * 18;
  const dash = healthScore == null ? 0 : (scorePct / 100) * ring;
  const currentMonth = periodLabel || monthFilterLabel || 'This period';

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <p className={styles.greeting}>
          {greetingForNow()}, {name}{' '}
          <span aria-hidden>👋</span>
        </p>
        <h1 className={styles.title}>Business Brief</h1>

        {showViewFilters ? (
          <div className={styles.filters} onMouseLeave={onFilterMouseLeave}>
            <button
              type="button"
              className={`${styles.chip} ${monthOnly ? styles.chipActive : ''}`}
              title="Current uploaded month"
              onClick={onSelectMonth}
              onMouseEnter={onHoverMonth}
            >
              <i className="ti ti-calendar" aria-hidden />
              {currentMonth}
            </button>
            <button
              type="button"
              className={`${styles.chip} ${!monthOnly ? styles.chipActive : ''}`}
              onClick={onSelectRolling}
              onMouseEnter={onHoverRolling}
              title="Compare last 3 months ending at the selected month"
            >
              Last 3 months
              {rollingLoading ? <i className="ti ti-loader-2" aria-hidden /> : null}
            </button>
          </div>
        ) : (
          <div className={styles.filters}>
            <span className={styles.chip}>
              <i className="ti ti-calendar" aria-hidden />
              {currentMonth}
            </span>
          </div>
        )}

        {viewMeta || footerMeta ? (
          <p className={styles.meta}>
            {[footerMeta, viewMeta].filter(Boolean).join(' · ')}
          </p>
        ) : null}
        {loadStatus && !monthOnly ? <p className={styles.status}>{loadStatus}</p> : null}
        {rollingError && !monthOnly ? (
          <p className={styles.error} role="alert">
            {rollingError}
          </p>
        ) : null}
      </div>

      <div className={styles.right}>
        <div className={styles.actions}>
          <button type="button" className={styles.shareBtn} disabled title="Coming soon">
            <i className="ti ti-share" aria-hidden />
            Share
          </button>
          <Link to="/onboarding" className={styles.uploadLink}>
            <i className="ti ti-upload" aria-hidden />
            Upload
          </Link>
        </div>

        <div
          className={styles.healthCard}
          aria-label={
            healthScore == null
              ? 'Business health unavailable'
              : `Business health ${healthScore} of 100`
          }
        >
          <div className={styles.healthText}>
            <div className={styles.healthLabel}>Business Health</div>
            <div className={styles.healthScore}>
              {healthScore == null ? '—' : healthScore} <span>/ 100</span>
            </div>
            {healthDelta != null && healthPrevLabel ? (
              <div
                className={`${styles.healthDelta} ${healthDeltaDown ? styles.healthDeltaDown : ''}`}
              >
                <i
                  className={`ti ${healthDeltaDown ? 'ti-caret-down-filled' : 'ti-caret-up-filled'}`}
                  aria-hidden
                />{' '}
                {healthDelta} vs {healthPrevLabel}
              </div>
            ) : (
              <div className={styles.healthDeltaMuted}>
                {healthCaption?.trim() || 'From your statements'}
              </div>
            )}
          </div>
          <svg className={styles.ring} viewBox="0 0 44 44" aria-hidden>
            <circle cx="22" cy="22" r="18" className={styles.ringTrack} />
            <circle
              cx="22"
              cy="22"
              r="18"
              className={styles.ringValue}
              strokeDasharray={`${dash} ${ring}`}
              strokeDashoffset="0"
            />
          </svg>
        </div>
      </div>
    </header>
  );
}
