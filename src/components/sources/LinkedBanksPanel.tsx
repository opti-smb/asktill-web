import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePlaidLinkBank } from '../../hooks/usePlaidLinkBank';
import { formatMoney } from '../../lib/format';
import {
  businessIdFromUser,
  refreshLinkedBankBalances,
  removeAllLinkedBanks,
  type LinkedBankAccount,
} from '../../lib/plaidClient';
import { restoreUploadsAfterPlaidUnlink } from '../../lib/api';
import {
  clearPlaidBankMetrics,
  restoreUploadDashboardBaseline,
} from '../../lib/plaidBankMetrics';
import { clearJustAnalyzedGrace, REPORT_HISTORY_REFRESH_EVENT } from '../../hooks/useReportSync';
import { clearActiveStatementView } from '../../lib/activeStatementView';
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
  onImported?: () => void;
};

export default function LinkedBanksPanel({ onImported }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const plaid = usePlaidLinkBank({
    onDataReady: onImported,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const businessId = user?.userId?.trim() ? businessIdFromUser(user.userId) : '';
  const accounts = plaid.accounts;

  const onRefresh = async () => {
    if (!businessId) return;
    setRefreshing(true);
    setActionError(null);
    try {
      await refreshLinkedBankBalances(businessId);
      await plaid.refreshAccounts();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not refresh balances.');
    } finally {
      setRefreshing(false);
    }
  };

  const onRemoveAll = async () => {
    if (!businessId) return;
    if (!window.confirm(
      'Remove all linked banks? Your uploaded statements stay on the dashboard.',
    )) return;
    setRemoving(true);
    setActionError(null);
    try {
      await removeAllLinkedBanks(businessId);
      try {
        await restoreUploadsAfterPlaidUnlink();
      } catch {
        /* Overlay restore is best-effort if the backend route is not live yet. */
      }
      if (user?.userId) {
        await restoreUploadDashboardBaseline(user.userId);
        clearPlaidBankMetrics(user.userId);
      }
      await plaid.refreshAccounts();
      clearActiveStatementView();
      clearJustAnalyzedGrace();
      window.dispatchEvent(new CustomEvent(REPORT_HISTORY_REFRESH_EVENT));
      onImported?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not remove linked banks.');
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
          <p className={styles.sub}>Live accounts from Link Bank.</p>
        </div>
        <div className={styles.actions}>
          {accounts.length > 0 ? (
            <>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => void onRefresh()}
                disabled={!businessId || refreshing || plaid.linking || removing}
              >
                <i className={`ti ${refreshing ? 'ti-loader-2' : 'ti-refresh'}`} aria-hidden />
                {refreshing ? 'Refreshing…' : 'Refresh balances'}
              </button>
              <button
                type="button"
                className={styles.dangerBtn}
                onClick={() => void onRemoveAll()}
                disabled={!businessId || refreshing || plaid.linking || removing}
              >
                <i className={`ti ${removing ? 'ti-loader-2' : 'ti-unlink'}`} aria-hidden />
                {removing ? 'Removing…' : 'Remove all banks'}
              </button>
            </>
          ) : null}
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => plaid.connectNewBank()}
            disabled={!plaid.canLink || plaid.linking || removing}
            title={
              accounts.length > 0
                ? 'Connect a different bank. The same bank cannot be linked twice.'
                : undefined
            }
          >
            <i className="ti ti-building-bank" aria-hidden />
            {plaid.linking ? 'Linking…' : accounts.length ? 'Link another bank' : 'Link Bank'}
          </button>
        </div>
      </div>

      {plaid.linkStatus ? <PlaidLinkStatusLine message={plaid.linkStatus} /> : null}
      {plaid.error || actionError ? (
        <p className={styles.err} role="alert">
          {actionError || plaid.error}
        </p>
      ) : null}

      {accounts.length === 0 ? (
        <div className={styles.empty}>
          <i className={`ti ti-building-bank ${styles.emptyIcon}`} aria-hidden />
          <p className={styles.emptyTitle}>No banks linked yet</p>
          <p className={styles.emptyBody}>
            Use Link Bank to connect a US bank. Uploads stay on{' '}
            <button
              type="button"
              className={styles.emptyLink}
              onClick={() => navigate('/dashboard/sources')}
            >
              Connect Accounts
            </button>
            .
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
                  <span className={styles.balanceLabel}>Available</span>
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
