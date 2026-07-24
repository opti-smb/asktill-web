import { useCallback, useEffect, useRef, useState } from 'react';

import SectionHeader from '../components/layout/SectionHeader';
import {
  fetchRewardsBalance,
  fetchRewardsLedger,
  type RewardsBalance,
  type RewardsLedgerEntry,
} from '../lib/api';

import styles from './AtRewardsPage.module.css';

const LIVE_POLL_MS = 15_000;

function formatMoney(usd: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usd);
}

function formatPoints(n: number): string {
  return new Intl.NumberFormat('en-US').format(Math.max(0, Math.floor(n)));
}

function formatClock(d: Date): string {
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Dashboard AT Rewards — live wallet from /api/rewards/balance. */
export default function AtRewardsPage() {
  const [balance, setBalance] = useState<RewardsBalance | null>(null);
  const [entries, setEntries] = useState<RewardsLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [live, setLive] = useState(true);
  const inFlight = useRef(false);

  const loadWallet = useCallback(async (opts?: { quiet?: boolean }) => {
    if (inFlight.current) return;
    inFlight.current = true;
    const quiet = Boolean(opts?.quiet);
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [bal, ledger] = await Promise.all([
        fetchRewardsBalance(),
        fetchRewardsLedger(12),
      ]);
      setBalance(bal);
      setEntries(ledger.entries ?? []);
      setUpdatedAt(new Date());
      setLive(true);
    } catch (err) {
      setLive(false);
      setError(err instanceof Error ? err.message : 'Could not load rewards wallet.');
    } finally {
      inFlight.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  // Tick the live clock every second
  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void loadWallet({ quiet: true });
    };
    const onFocus = () => void loadWallet({ quiet: true });
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadWallet({ quiet: true });
    }, LIVE_POLL_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
      window.clearInterval(timer);
    };
  }, [loadWallet]);

  const rate = Math.max(1, balance?.conversion_rate ?? 100);
  const points = balance?.points ?? 0;
  const usd = balance?.usd_value ?? points / rate;

  return (
    <>
      <SectionHeader
        periodMeta="AT REWARDS"
        title={
          <>
            Your <em>wallet.</em>
          </>
        }
      />
      <div className={styles.main}>
        <div className="wrap">
          <div className={styles.statusBar}>
            <div className={styles.statusLeft}>
              <span className={styles.statusTitle}>Live wallet</span>
              <span className={styles.statusClock} aria-live="polite">
                {formatClock(now)}
              </span>
            </div>
            <div className={styles.statusRight}>
              <span
                className={`${styles.livePill} ${live && !error ? styles.liveOn : styles.liveOff}`}
              >
                <span className={styles.liveDot} aria-hidden />
                {live && !error ? (refreshing ? 'Updating' : 'Live') : 'Offline'}
              </span>
              <span className={styles.synced}>
                Synced {updatedAt ? formatClock(updatedAt) : '—'}
              </span>
            </div>
          </div>

          <div className={styles.wallet}>
            {loading && !balance ? (
              <p className={styles.hint}>Loading your points…</p>
            ) : null}

            {error && !balance ? (
              <p className={styles.error} role="alert">
                {error}{' '}
                <button type="button" className={styles.retry} onClick={() => void loadWallet()}>
                  Retry
                </button>
              </p>
            ) : null}

            {balance || !loading ? (
              <>
                <div className={styles.healthBanner}>
                  <div className={styles.healthMonth}>AT Rewards · live</div>
                  <div className={styles.healthSentence}>
                    You have <span className={styles.accent}>{formatPoints(points)} pts</span>
                    {' '}worth{' '}
                    <span className={styles.accent}>{formatMoney(usd)}</span>
                  </div>
                </div>

                <div className={styles.walletGrid}>
                  <div className={styles.statBox}>
                    <span className={styles.statLbl}>Current points</span>
                    <span className={styles.statVal}>{formatPoints(points)}</span>
                    <span className={styles.statSub}>pts available now</span>
                  </div>
                  <div className={styles.statBox}>
                    <span className={styles.statLbl}>Wallet value</span>
                    <span className={styles.statVal}>{formatMoney(usd)}</span>
                    <span className={styles.statSub}>{rate} pts = $1</span>
                  </div>
                </div>

                <div className={styles.metaRow}>
                  <div className={styles.metaCell}>
                    <span className={styles.metaLbl}>Lifetime earned</span>
                    <span className={styles.metaVal}>
                      {formatPoints(balance?.lifetime_earned ?? 0)} pts
                    </span>
                  </div>
                  <div className={styles.metaCell}>
                    <span className={styles.metaLbl}>Lifetime redeemed</span>
                    <span className={styles.metaVal}>
                      {formatPoints(balance?.lifetime_redeemed ?? 0)} pts
                    </span>
                  </div>
                  <div className={styles.metaCell}>
                    <span className={styles.metaLbl}>Conversion</span>
                    <span className={styles.metaVal}>{rate} pts / $1</span>
                  </div>
                </div>
              </>
            ) : null}

            {error && balance ? (
              <p className={styles.warn} role="status">
                Couldn’t refresh — showing last known balance.{' '}
                <button
                  type="button"
                  className={styles.retry}
                  onClick={() => void loadWallet({ quiet: true })}
                >
                  Retry
                </button>
              </p>
            ) : null}
          </div>

          <section className={styles.activity} aria-label="Recent rewards activity">
            <div className={styles.activityHead}>Recent activity</div>
            {entries.length === 0 && !loading ? (
              <p className={styles.activityEmpty}>
                No points yet. Upload statements, open your AT Letter, or refer a business to start
                earning.
              </p>
            ) : (
              <ul className={styles.activityList}>
                {entries.map((entry) => {
                  const earn = entry.points >= 0;
                  return (
                    <li key={entry.txn_id} className={styles.activityRow}>
                      <div className={styles.activityMain}>
                        <span className={styles.activityAction}>
                          {entry.notes?.trim() || entry.action_code.replace(/_/g, ' ')}
                        </span>
                        <span className={styles.activityWhen}>
                          {formatWhen(entry.event_date)} · {entry.type}
                        </span>
                      </div>
                      <div className={earn ? styles.ptsEarn : styles.ptsSpend}>
                        {earn ? '+' : ''}
                        {formatPoints(entry.points)} pts
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
