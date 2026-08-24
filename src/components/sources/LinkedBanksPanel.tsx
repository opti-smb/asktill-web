import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../../context/AuthContext';
import { usePlaidLinkBank } from '../../hooks/usePlaidLinkBank';
import { formatMoney } from '../../lib/format';
import { restoreUploadDashboardBaseline, refreshPlaidBankMetricsOverlay, loadPlaidBankMetrics } from '../../lib/plaidBankMetrics';
import {
  businessIdFromUser,
  clearStatementConsentSkipped,
  fetchLinkedBankAccounts,
  refreshLinkedBankBalances,
  removeAllLinkedBanks,
  type LinkedBankAccount,
} from '../../lib/plaidClient';
import PlaidLinkStatusLine from '../upload/PlaidLinkStatusLine';
import styles from './LinkedBanksPanel.module.css';

function moneyValue(value: number | string | null | undefined): string {
  if (value == null || value === '') return '—';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '—';
  return formatMoney(n);
}

function accountLabel(account: LinkedBankAccount): string {
  const name = account.name?.trim() || account.official_name?.trim() || 'Account';
  return account.mask ? `${name} ···${account.mask}` : name;
}

function typeLabel(account: LinkedBankAccount): string {
  const parts = [account.subtype, account.type].filter(Boolean);
  if (!parts.length) return 'Bank account';
  return parts
    .map((p) => String(p).replace(/_/g, ' '))
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' · ');
}

type Props = {
  /** After background import succeeds — e.g. navigate to dashboard. */
  onImported?: () => void;
};

export default function LinkedBanksPanel({ onImported }: Props) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<LinkedBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const businessId = user?.userId?.trim() ? businessIdFromUser(user.userId) : null;

  const loadAccounts = useCallback(async () => {
    if (!businessId) {
      setAccounts([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setAccounts(await fetchLinkedBankAccounts(businessId));
    } catch (err) {
      setAccounts([]);
      setError(
        err instanceof Error
          ? err.message
          : 'Could not load linked banks.',
      );
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  const { linkNewBank, busy: linking, status: linkStatus, ready: canLink } = usePlaidLinkBank(
    user?.userId,
    {
      onLinked: ({ bankMetricsUpdated }) => {
        void loadAccounts();
        if (bankMetricsUpdated) {
          onImported?.();
        }
      },
    },
  );

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const onRefresh = async () => {
    if (!businessId || !user?.userId?.trim()) return;
    setRefreshing(true);
    setError(null);
    try {
      await refreshLinkedBankBalances(businessId);
      const cached = loadPlaidBankMetrics(user.userId.trim());
      await refreshPlaidBankMetricsOverlay(businessId, user.userId.trim(), {
        sync: true,
        mode: cached?.linkMode ?? 'realtime',
      });
      await loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not refresh balances.');
    } finally {
      setRefreshing(false);
    }
  };

  const onRemoveAll = async () => {
    if (!businessId) return;
    if (!window.confirm('Remove all linked banks? You can Link Bank again fresh.')) return;
    setRemoving(true);
    setError(null);
    try {
      await removeAllLinkedBanks(businessId);
      clearStatementConsentSkipped(businessId);
      if (user?.userId?.trim()) {
        await restoreUploadDashboardBaseline(user.userId.trim());
      }
      setAccounts([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove linked banks.');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <section className={styles.section} aria-labelledby="linked-banks-title">
      <div className={styles.head}>
        <div className={styles.headText}>
          <h2 id="linked-banks-title" className={styles.title}>
            Linked Banks
          </h2>
          <p className={styles.sub}>
            Live accounts from Link Bank.
          </p>
        </div>
        <div className={styles.actions}>
          {accounts.length > 0 ? (
            <>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => void onRefresh()}
                disabled={!businessId || refreshing || linking || removing}
              >
                <i className={`ti ${refreshing ? 'ti-loader-2' : 'ti-refresh'}`} aria-hidden />
                {refreshing ? 'Refreshing…' : 'Refresh balances'}
              </button>
              <button
                type="button"
                className={styles.dangerBtn}
                onClick={() => void onRemoveAll()}
                disabled={!businessId || refreshing || linking || removing}
              >
                <i className={`ti ${removing ? 'ti-loader-2' : 'ti-unlink'}`} aria-hidden />
                {removing ? 'Removing…' : 'Remove all banks'}
              </button>
            </>
          ) : null}
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => void linkNewBank()}
            disabled={!canLink || linking || removing}
            title={
              accounts.length > 0
                ? 'Connect a different bank. The same bank cannot be linked twice.'
                : undefined
            }
          >
            <i className="ti ti-building-bank" aria-hidden />
            {linking ? 'Linking…' : accounts.length ? 'Link another bank' : 'Link Bank'}
          </button>
        </div>
      </div>

      {linkStatus ? <PlaidLinkStatusLine message={linkStatus} /> : null}
      {error ? (
        <p className={styles.err} role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className={styles.muted}>Loading linked banks…</p>
      ) : accounts.length === 0 ? (
        <div className={styles.empty}>
          <i className={`ti ti-building-bank ${styles.emptyIcon}`} aria-hidden />
          <p className={styles.emptyTitle}>No banks linked yet</p>
          <p className={styles.emptyBody}>
            Use Link Bank to connect a US bank. Uploads stay on Connect Accounts.
          </p>
        </div>
      ) : (
        <ul className={styles.list}>
          {accounts.map((account) => (
            <li key={account.account_id} className={styles.card}>
              <span className={styles.icon} aria-hidden>
                <i className="ti ti-building-bank" />
              </span>
              <div className={styles.main}>
                <div className={styles.bank}>
                  {account.institution_name?.trim() || 'Linked bank'}
                </div>
                <div className={styles.account}>{accountLabel(account)}</div>
                <div className={styles.meta}>{typeLabel(account)}</div>
              </div>
              <div className={styles.balances}>
                <div className={styles.balanceBlock}>
                  <span className={styles.balanceLabel}>Cash available</span>
                  <span className={styles.balanceValue}>
                    {moneyValue(account.available_balance ?? account.current_balance)}
                  </span>
                </div>
                {account.current_balance != null &&
                account.available_balance != null &&
                String(account.current_balance) !== String(account.available_balance) ? (
                  <div className={styles.balanceBlock}>
                    <span className={styles.balanceLabel}>Current</span>
                    <span className={styles.balanceMuted}>
                      {moneyValue(account.current_balance)}
                    </span>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
