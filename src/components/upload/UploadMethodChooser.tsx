import styles from './UploadMethodChooser.module.css';
import PlaidLinkStatusLine from './PlaidLinkStatusLine';

export type UploadMethod = 'realtime' | 'monthly' | 'manual';

type Props = {
  linking?: boolean;
  /** Which connect mode is in progress — only that tile shows "Connecting…". */
  linkingMode?: UploadMethod | null;
  linkStatus?: string | null;
  canLink?: boolean;
  /** Bank already linked — buttons stay enabled for sync / statement pulls. */
  bankLinked?: boolean;
  compact?: boolean;
  /** `bar` — labeled buttons. `tiles` — icon tiles for compact dashboard. */
  variant?: 'cards' | 'bar' | 'tiles';
  onConnectRealtime: () => void;
  onConnectMonthly: () => void;
  onChooseManual: () => void;
};

function IconRealtime() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}

function IconMonthly() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="m9 16 2 2 4-4" />
    </svg>
  );
}

function IconManual() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="M12 12v9" />
      <path d="m16 16-4-4-4 4" />
    </svg>
  );
}

export default function UploadMethodChooser({
  linking = false,
  linkingMode = null,
  linkStatus = null,
  canLink = true,
  bankLinked = false,
  compact = false,
  variant = 'cards',
  onConnectRealtime,
  onConnectMonthly,
  onChooseManual,
}: Props) {
  const linkDisabled = !canLink || linking || linkingMode !== null;

  const realtimeLabel = linkingMode === 'realtime'
    ? 'Connecting…'
    : bankLinked
      ? 'Sync live transactions'
      : 'Connect real-time';
  const monthlyLabel = linkingMode === 'monthly'
    ? 'Connecting…'
    : bankLinked
      ? 'Pull monthly statements'
      : 'Connect monthly';

  if (variant === 'tiles') {
    return (
      <div className={styles.tilesWrap}>
        <div className={styles.tilesHead}>
          <h2 className={styles.tilesTitle}>How to bring in data</h2>
          <p className={styles.tilesSub}>Link your bank for automatic sync, or upload statement PDFs.</p>
        </div>
        <div className={styles.tilesRow}>
          <button
            type="button"
            className={`${styles.tile} ${styles.tileGreen}`}
            onClick={onConnectRealtime}
            disabled={linkDisabled}
          >
            <span className={styles.tileIcon} aria-hidden>
              <i className="ti ti-plug-connected" />
            </span>
            <span className={styles.tileCopy}>
              <span className={styles.tileLabel}>{realtimeLabel}</span>
              <span className={styles.tileHint}>Live transactions from your bank</span>
            </span>
          </button>
          <button
            type="button"
            className={`${styles.tile} ${styles.tilePurple}`}
            onClick={onConnectMonthly}
            disabled={linkDisabled}
          >
            <span className={styles.tileIcon} aria-hidden>
              <i className="ti ti-calendar-month" />
            </span>
            <span className={styles.tileCopy}>
              <span className={styles.tileLabel}>{monthlyLabel}</span>
              <span className={styles.tileHint}>Fetch statements each month</span>
            </span>
          </button>
          <button type="button" className={`${styles.tile} ${styles.tileBlue}`} onClick={onChooseManual}>
            <span className={styles.tileIcon} aria-hidden>
              <i className="ti ti-upload" />
            </span>
            <span className={styles.tileCopy}>
              <span className={styles.tileLabel}>Upload PDFs</span>
              <span className={styles.tileHint}>Bank, POS, or ecommerce files</span>
            </span>
          </button>
        </div>
        {linkStatus ? <PlaidLinkStatusLine message={linkStatus} /> : null}
      </div>
    );
  }

  if (variant === 'bar') {
    return (
      <div className={styles.barWrap}>
        <div className={styles.barHead}>
          <h2 className={styles.barTitle}>Connect your bank</h2>
          <p className={styles.barSub}>
            Real-time or monthly via Plaid — or scroll down to upload PDFs manually.
          </p>
        </div>
        <div className={styles.barActions}>
          <button
            type="button"
            className={`${styles.barBtn} ${styles.barBtnGreen}`}
            onClick={onConnectRealtime}
            disabled={linkDisabled}
          >
            <i className="ti ti-plug-connected" aria-hidden />
            {realtimeLabel}
          </button>
          <button
            type="button"
            className={`${styles.barBtn} ${styles.barBtnPurple}`}
            onClick={onConnectMonthly}
            disabled={linkDisabled}
          >
            <i className="ti ti-calendar-month" aria-hidden />
            {monthlyLabel}
          </button>
          <button
            type="button"
            className={`${styles.barBtn} ${styles.barBtnBlue}`}
            onClick={onChooseManual}
          >
            <i className="ti ti-upload" aria-hidden />
            Upload PDFs
          </button>
        </div>
        {linkStatus ? <PlaidLinkStatusLine message={linkStatus} /> : null}
      </div>
    );
  }

  return (
    <div className={`${styles.wrap} ${compact ? styles.compact : ''}`}>
      <div className={styles.grid}>
        <article className={`${styles.card} ${styles.toneGreen}`}>
          <span className={styles.badge}>Most preferred</span>
          <div className={styles.iconWell} aria-hidden>
            <IconRealtime />
          </div>
          <h2 className={styles.title}>1. Real-time connection</h2>
          <p className={styles.desc}>
            Connect via Plaid or other aggregators for real-time account information.
          </p>
          <div className={styles.tags}>
            <span>Real-time updates</span>
            <span>Monthly run rate</span>
            <span>Automatic sync</span>
          </div>
          <div className={styles.bestFor}>
            <strong>Best for</strong>
            <span>Most accurate view of your cash flow and monthly run rate.</span>
          </div>
          <div className={styles.footer}>
            <button
              type="button"
              className={styles.cta}
              onClick={onConnectRealtime}
              disabled={linkDisabled}
            >
              {realtimeLabel}
            </button>
            <p className={styles.secure}>Secured by Plaid &amp; partners</p>
          </div>
        </article>

        <article className={`${styles.card} ${styles.tonePurple}`}>
          <div className={styles.iconWell} aria-hidden>
            <IconMonthly />
          </div>
          <h2 className={styles.title}>2. Monthly statement sync</h2>
          <p className={styles.desc}>
            Connect via Plaid or other aggregators to fetch statements at the end of each month.
          </p>
          <div className={styles.tags}>
            <span>Monthly statements</span>
            <span>End of month sync</span>
            <span>Secure &amp; reliable</span>
          </div>
          <div className={styles.bestFor}>
            <strong>Best for</strong>
            <span>Businesses that prefer monthly review and reconciliation.</span>
          </div>
          <div className={styles.footer}>
            <button
              type="button"
              className={styles.cta}
              onClick={onConnectMonthly}
              disabled={linkDisabled}
            >
              {monthlyLabel}
            </button>
            <p className={styles.secure}>Secured by Plaid &amp; partners</p>
          </div>
        </article>

        <article className={`${styles.card} ${styles.toneBlue}`}>
          <div className={styles.iconWell} aria-hidden>
            <IconManual />
          </div>
          <h2 className={styles.title}>3. Manual upload</h2>
          <p className={styles.desc}>Upload your statements manually at the end of each month.</p>
          <div className={styles.tags}>
            <span>Full control</span>
            <span>Any format</span>
            <span>Quick &amp; easy</span>
          </div>
          <div className={styles.bestFor}>
            <strong>Best for</strong>
            <span>Businesses that prefer manual uploads or use multiple providers.</span>
          </div>
          <div className={styles.footer}>
            <button type="button" className={styles.cta} onClick={onChooseManual}>
              Upload statements
            </button>
            <p className={styles.secure}>Supports PDF, CSV, XLSX</p>
          </div>
        </article>
      </div>

      {linkStatus ? <PlaidLinkStatusLine message={linkStatus} /> : null}
    </div>
  );
}
