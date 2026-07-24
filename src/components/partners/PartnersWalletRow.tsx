import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { fetchRewardsBalance, type RewardsBalance } from '../../lib/api';

import styles from '../../pages/ChannelPartnersPage.module.css';

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

/** Compact live wallet + earn box above Loans / CPAs. */
export default function PartnersWalletRow() {
  const [balance, setBalance] = useState<RewardsBalance | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const bal = await fetchRewardsBalance();
      setBalance(bal);
    } catch {
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  const rate = Math.max(1, balance?.conversion_rate ?? 100);
  const points = balance?.points ?? 0;
  const usd = balance?.usd_value ?? points / rate;

  return (
    <div className={styles.walletRow}>
      <div className={styles.walletBox}>
        <span className={styles.walletEyebrow}>AT Rewards wallet</span>
        {loading && !balance ? (
          <p className={styles.walletHint}>Loading…</p>
        ) : (
          <>
            <div className={styles.walletStats}>
              <div>
                <span className={styles.walletLbl}>Points</span>
                <span className={styles.walletVal}>{formatPoints(points)}</span>
              </div>
              <div>
                <span className={styles.walletLbl}>Value</span>
                <span className={styles.walletVal}>{formatMoney(usd)}</span>
              </div>
            </div>
            <p className={styles.walletHint}>{rate} pts = $1 · live balance</p>
          </>
        )}
        <Link to="/dashboard/rewards" className={styles.walletLink}>
          Open wallet →
        </Link>
      </div>

      <div className={styles.earnBox}>
        <span className={styles.cardIcon} aria-hidden>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v8M8 12h8" />
          </svg>
        </span>
        <span className={styles.earnEyebrow}>Redeem on book</span>
        <span className={styles.earnTitle}>Use wallet for consultations</span>
        <span className={styles.earnBlurb}>
          Tap Book Consultation on an advisor to redeem AT Rewards points toward the session.
        </span>
      </div>
    </div>
  );
}
