import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import SectionHeader from '../components/layout/SectionHeader';
import Spinner from '../components/common/Spinner';
import {
  fetchRewardsBalance,
  fetchRewardsLedger,
  type RewardsBalance,
  type RewardsLedgerEntry,
} from '../lib/api';
import { formatMoney, formatPoints } from '../lib/format';
import { getCachedRewardsWallet, putCachedRewardsWallet } from '../lib/rewardsWalletCache';

import styles from './AtRewardsPage.module.css';

const LIVE_POLL_MS = 30_000;

type ActivityTone = 'green' | 'blue' | 'purple' | 'orange';

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

/** Icon + color from ledger action — visual only. */
function activityVisual(entry: RewardsLedgerEntry): { tone: ActivityTone; icon: string } {
  const code = `${entry.action_code} ${entry.notes ?? ''} ${entry.type}`.toLowerCase();
  if (entry.points < 0 || /redeem|spend|debit/.test(code)) {
    return { tone: 'orange', icon: 'ti-arrow-down' };
  }
  if (/bank/.test(code)) return { tone: 'green', icon: 'ti-upload' };
  if (/\bpos\b|point.of.sale|terminal/.test(code)) return { tone: 'blue', icon: 'ti-upload' };
  if (/e-?com|shopify|online|web/.test(code)) return { tone: 'purple', icon: 'ti-upload' };
  if (/letter|open|read|bonus|mail/.test(code)) return { tone: 'orange', icon: 'ti-mail' };
  if (/refer/.test(code)) return { tone: 'purple', icon: 'ti-users' };
  return { tone: 'blue', icon: 'ti-upload' };
}

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

/** Dashboard AT Rewards — live wallet from /api/rewards/balance. */
export default function AtRewardsPage() {
  const cached = getCachedRewardsWallet();
  const [balance, setBalance] = useState<RewardsBalance | null>(cached?.balance ?? null);
  const [entries, setEntries] = useState<RewardsLedgerEntry[]>(cached?.entries ?? []);
  const [loading, setLoading] = useState(!cached?.balance);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(
    cached?.updatedAt ? new Date(cached.updatedAt) : null,
  );
  const [now, setNow] = useState(() => new Date());
  const [live, setLive] = useState(Boolean(cached?.balance));
  const [ledgerLimit, setLedgerLimit] = useState(12);
  const [rangeMonths, setRangeMonths] = useState<3 | 6 | 12>(6);
  const inFlight = useRef(false);
  const booted = useRef(false);

  const loadWallet = useCallback(async (opts?: { quiet?: boolean; limit?: number }) => {
    if (inFlight.current) return;
    inFlight.current = true;
    const quiet = Boolean(opts?.quiet) || Boolean(getCachedRewardsWallet()?.balance);
    const limit = opts?.limit ?? ledgerLimit;
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [bal, ledger] = await Promise.all([
        fetchRewardsBalance(),
        fetchRewardsLedger(limit),
      ]);
      const nextEntries = ledger.entries ?? [];
      setBalance(bal);
      setEntries(nextEntries);
      putCachedRewardsWallet(bal, nextEntries);
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
  }, [ledgerLimit]);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    void loadWallet({ quiet: Boolean(getCachedRewardsWallet()?.balance) });
  }, [loadWallet]);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void loadWallet({ quiet: true });
    };
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadWallet({ quiet: true });
    }, LIVE_POLL_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [loadWallet]);

  const rate = Math.max(1, balance?.conversion_rate ?? 100);
  const points = balance?.points ?? 0;
  const usd = balance?.usd_value ?? points / rate;

  const visibleEntries = useMemo(() => {
    const cut = monthsAgo(rangeMonths).getTime();
    return entries.filter((e) => {
      if (!e.event_date) return true;
      const t = new Date(e.event_date).getTime();
      return Number.isNaN(t) || t >= cut;
    });
  }, [entries, rangeMonths]);

  const viewAllActivity = () => {
    const next = 50;
    setLedgerLimit(next);
    void loadWallet({ quiet: true, limit: next });
  };

  return (
    <>
      <SectionHeader
        periodMeta="save money here"
        title={
          <>
            Your <em>wallet.</em>
          </>
        }
        actions={
          <div className={styles.headerTools}>
            <label className={styles.rangeSelect}>
              <i className="ti ti-calendar" aria-hidden />
              <select
                value={rangeMonths}
                aria-label="Activity range"
                onChange={(e) => setRangeMonths(Number(e.target.value) as 3 | 6 | 12)}
              >
                <option value={3}>Last 3 months</option>
                <option value={6}>Last 6 months</option>
                <option value={12}>Last 12 months</option>
              </select>
              <i className="ti ti-chevron-down" aria-hidden />
            </label>
            <button
              type="button"
              className={styles.bellBtn}
              aria-label="Notifications"
              title="Notifications"
            >
              <i className="ti ti-bell" aria-hidden />
            </button>
          </div>
        }
      />
      <div className={styles.main}>
        <div className="wrap">
          <div className={styles.page}>
            <div className={styles.scrollViewport}>
              <div className={styles.statusBar}>
                <div className={styles.statusLeft}>
                  <span className={styles.livePulse} aria-hidden />
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
                  <div className={styles.hint}>
                    <Spinner label="Loading your points…" size="sm" />
                  </div>
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
                    <div className={styles.hero}>
                      <div className={styles.heroCopy}>
                        <div className={styles.healthMonth}>
                          <span className={styles.liveMark} aria-hidden />
                          AT Rewards · live
                        </div>
                        <div className={styles.healthSentence}>
                          You have{' '}
                          <span className={styles.ptsAccent}>{formatPoints(points)} pts</span>
                          {' '}worth{' '}
                          <span className={styles.cashAccent}>{formatMoney(usd)}</span>
                        </div>
                      </div>

                      {/* Wallet + coins — transparent cutout (no card plate) */}
                      <div className={styles.heroArt} aria-hidden>
                        <img
                          className={styles.walletImg}
                          src="/rewards/wallet-coins.png?v=3"
                          alt=""
                          width={198}
                          height={140}
                          draggable={false}
                        />
                      </div>
                    </div>

                    <div className={styles.walletGrid}>
                      <div className={`${styles.statBox} ${styles.statBlue}`}>
                        <span className={`${styles.statIcon} ${styles.statIconBlue}`} aria-hidden>
                          <span className={styles.statIconCore}>
                            <svg
                              className={styles.statGlyph}
                              viewBox="0 0 24 24"
                              width="14"
                              height="14"
                              fill="currentColor"
                            >
                              <path d="M12 2.5l2.7 6.1 6.6.6-5 4.4 1.5 6.5L12 16.8 6.2 20.1l1.5-6.5-5-4.4 6.6-.6L12 2.5z" />
                            </svg>
                          </span>
                        </span>
                        <div className={styles.statCopy}>
                          <span className={styles.statLbl}>Current points</span>
                          <span className={styles.statVal}>{formatPoints(points)}</span>
                          <span className={styles.statSub}>pts available now</span>
                        </div>
                      </div>
                      <div className={`${styles.statBox} ${styles.statGreen}`}>
                        <span className={`${styles.statIcon} ${styles.statIconGreen}`} aria-hidden>
                          <span className={styles.statIconCore}>
                            <i className="ti ti-wallet" />
                          </span>
                        </span>
                        <div className={styles.statCopy}>
                          <span className={styles.statLbl}>Wallet value</span>
                          <span className={styles.statVal}>{formatMoney(usd)}</span>
                          <span className={styles.statSub}>{rate} pts = $1</span>
                        </div>
                      </div>
                    </div>

                    <div className={styles.metaRow}>
                      <div className={`${styles.metaCell} ${styles.metaPurple}`}>
                        <span className={`${styles.metaIcon} ${styles.metaIconPurple}`} aria-hidden>
                          <i className="ti ti-trending-up" />
                        </span>
                        <div>
                          <span className={styles.metaLbl}>Lifetime earned</span>
                          <span className={styles.metaVal}>
                            {formatPoints(balance?.lifetime_earned ?? 0)} pts
                          </span>
                        </div>
                      </div>
                      <div className={`${styles.metaCell} ${styles.metaOrange}`}>
                        <span className={`${styles.metaIcon} ${styles.metaIconOrange}`} aria-hidden>
                          <i className="ti ti-arrow-down-circle" />
                        </span>
                        <div>
                          <span className={styles.metaLbl}>Lifetime redeemed</span>
                          <span className={styles.metaVal}>
                            {formatPoints(balance?.lifetime_redeemed ?? 0)} pts
                          </span>
                        </div>
                      </div>
                      <div className={`${styles.metaCell} ${styles.metaPink}`}>
                        <span className={`${styles.metaIcon} ${styles.metaIconPink}`} aria-hidden>
                          <i className="ti ti-refresh" />
                        </span>
                        <div>
                          <span className={styles.metaLbl}>Conversion</span>
                          <span className={styles.metaVal}>{rate} pts / $1</span>
                        </div>
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
                <div className={styles.activityHead}>
                  <div className={styles.activityTitle}>
                    <span className={styles.activityClock} aria-hidden>
                      <i className="ti ti-clock" />
                    </span>
                    Recent activity
                  </div>
                  <button
                    type="button"
                    className={styles.viewAll}
                    onClick={viewAllActivity}
                    disabled={refreshing || ledgerLimit >= 50}
                  >
                    View all activity
                    <i className="ti ti-chevron-right" aria-hidden />
                  </button>
                </div>
                {visibleEntries.length === 0 && !loading ? (
                  <p className={styles.activityEmpty}>
                    No points yet. Upload statements, open your AT Letter, or refer a business to
                    start earning.
                  </p>
                ) : (
                  <ul className={styles.activityList}>
                    {visibleEntries.map((entry) => {
                      const earn = entry.points >= 0;
                      const { tone, icon } = activityVisual(entry);
                      return (
                        <li key={entry.txn_id} className={styles.activityRow}>
                          <span
                            className={`${styles.activityIcon} ${styles[`tone_${tone}`]}`}
                            aria-hidden
                          >
                            <i className={`ti ${icon}`} />
                          </span>
                          <div className={styles.activityMain}>
                            <span className={styles.activityAction}>
                              {entry.notes?.trim() || entry.action_code.replace(/_/g, ' ')}
                            </span>
                            <span className={styles.activityWhen}>
                              {formatWhen(entry.event_date)} · {entry.type}
                            </span>
                          </div>
                          <div
                            className={`${styles.ptsBadge} ${styles[`badge_${tone}`]}`}
                          >
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
        </div>
      </div>
    </>
  );
}
