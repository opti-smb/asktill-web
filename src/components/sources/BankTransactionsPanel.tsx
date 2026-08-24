import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '../../context/AuthContext';
import {
  businessIdFromUser,
  fetchBankTransactions,
  syncBankTransactions,
  type BankTransaction,
} from '../../lib/plaidClient';
import { parseAndIngestPlaidTransactions } from '../../lib/plaidIngest';
import {
  defaultCustomMonthRange,
  isValidCustomMonthRange,
  loadStatementRangePreference,
  resolveStatementRange,
  saveStatementRangePreference,
  STATEMENT_RANGE_OPTIONS,
  statementRangeLabel,
  statementRangeToRequest,
  yearOptions,
  type CustomMonthRange,
  type StatementRangePreset,
} from '../../lib/statementRange';

import styles from './BankTransactionsPanel.module.css';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function formatMoney(amount: number | string, currency: string | null): string {
  const n = typeof amount === 'number' ? amount : Number(amount);
  const value = Number.isFinite(n) ? n : 0;
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString(undefined, {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 2,
  });
  if (value > 0) return `−${formatted}`;
  if (value < 0) return `+${formatted}`;
  return formatted;
}

function txTitle(tx: BankTransaction): string {
  return (tx.merchant_name || tx.name || 'Transaction').trim();
}

function txCategory(tx: BankTransaction): string {
  const cats = Array.isArray(tx.category) ? tx.category.filter(Boolean) : [];
  return cats.length ? cats.slice(0, 2).join(' · ') : 'Uncategorized';
}

type Props = {
  refreshKey?: number;
  compact?: boolean;
};

/**
 * Transactions stay hidden until the user opts in; choosing a period loads and shows them.
 */
export default function BankTransactionsPanel({ refreshKey = 0, compact = false }: Props) {
  const { user } = useAuth();
  const [revealed, setRevealed] = useState(false);
  const [shown, setShown] = useState(false);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [preset, setPreset] = useState<StatementRangePreset>('3m');
  const [custom, setCustom] = useState<CustomMonthRange>(() => defaultCustomMonthRange());
  const rangeInitialized = useRef(false);

  const businessId = user?.userId?.trim() ? businessIdFromUser(user.userId) : null;
  const years = useMemo(() => yearOptions(), []);

  const activeRange = useMemo(
    () => resolveStatementRange(preset, preset === 'custom' ? custom : undefined),
    [preset, custom],
  );
  const rangeRequest = useMemo(() => statementRangeToRequest(activeRange), [activeRange]);
  const customValid = preset !== 'custom' || isValidCustomMonthRange(custom);

  useEffect(() => {
    if (!businessId || rangeInitialized.current) return;
    rangeInitialized.current = true;
    const saved = loadStatementRangePreference(businessId);
    setPreset(saved.preset);
    setCustom(saved.custom);
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;
    saveStatementRangePreference(businessId, preset, custom);
  }, [businessId, preset, custom]);

  const loadTransactions = useCallback(async () => {
    if (!businessId) {
      setTransactions([]);
      setLoading(false);
      return;
    }
    if (!customValid) {
      setTransactions([]);
      setLoading(false);
      setError('Pick a valid from/to month and year.');
      return;
    }
    setLoading(true);
    setError(null);
    setHint(null);
    setTransactions([]);
    try {
      const rows = await fetchBankTransactions(businessId, rangeRequest, 200);
      setTransactions(rows);
      setShown(true);
      if (rows.length === 0) {
        setHint(
          `No transactions for ${statementRangeLabel(activeRange)}. Try a wider period, or Sync first.`,
        );
      }
    } catch (err) {
      setTransactions([]);
      setError(err instanceof Error ? err.message : 'Could not load bank transactions.');
    } finally {
      setLoading(false);
    }
  }, [businessId, rangeRequest, customValid, activeRange]);

  useEffect(() => {
    if (!revealed || !businessId || !customValid) return;
    void loadTransactions();
  }, [revealed, businessId, customValid, rangeRequest, refreshKey, loadTransactions]);

  const onSync = async () => {
    if (!businessId) return;
    setSyncing(true);
    setError(null);
    setHint(null);
    try {
      await syncBankTransactions(businessId);
      await loadTransactions();
      setHint('Transactions synced from linked banks.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sync bank transactions.');
    } finally {
      setSyncing(false);
    }
  };

  const onImportForAnalysis = async () => {
    if (!businessId || !customValid) return;
    setImporting(true);
    setError(null);
    setHint(null);
    try {
      const { ingest, parsed } = await parseAndIngestPlaidTransactions(businessId, rangeRequest, {
        sync: false,
      });
      const saved = ingest?.success_count ?? 0;
      const failed = ingest?.failure_count ?? 0;
      if (saved > 0) {
        setHint(
          `Imported ${saved} transaction month(s) for analysis` +
            (failed > 0 ? ` (${failed} could not be imported).` : '.'),
        );
      } else if (parsed.some((p) => p.ok)) {
        setHint('Transactions parsed but could not be saved — check for duplicate months.');
      } else {
        setHint('No transactions could be parsed. Try Sync first.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import transactions for analysis.');
    } finally {
      setImporting(false);
    }
  };

  const onPresetChange = (next: StatementRangePreset) => {
    setPreset(next);
    setHint(null);
    if (next === 'custom' && !isValidCustomMonthRange(custom)) {
      setCustom(defaultCustomMonthRange());
    }
  };

  const setCustomPart = (part: Partial<CustomMonthRange>) => {
    setCustom((prev) => ({ ...prev, ...part }));
    setHint(null);
  };

  const onHideTransactions = () => {
    setRevealed(false);
    setShown(false);
    setTransactions([]);
    setError(null);
    setHint(null);
  };

  if (!revealed) {
    return (
      <section
        className={`${styles.section} ${compact ? styles.compact : ''}`}
        aria-labelledby="bank-transactions-reveal"
      >
        <div className={styles.revealCard}>
          <span className={styles.revealIcon} aria-hidden>
            <i className="ti ti-receipt" />
          </span>
          <div className={styles.revealText}>
            <h2 id="bank-transactions-reveal" className={styles.title}>
              Bank transactions
            </h2>
            {!compact ? (
              <p className={styles.sub}>
                Want to see transaction rows from linked banks? Pick a month range next — nothing
                loads until you choose.
              </p>
            ) : (
              <p className={styles.sub}>Transaction rows from your linked bank</p>
            )}
          </div>
          <button
            type="button"
            className={styles.revealBtn}
            onClick={() => setRevealed(true)}
            disabled={!businessId}
          >
            <i className="ti ti-eye" aria-hidden />
            {compact ? 'Show transactions' : 'Want to see your transactions?'}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`${styles.section} ${compact ? styles.compact : ''}`}
      aria-labelledby="bank-transactions-title"
    >
      <div className={styles.head}>
        <div className={styles.headText}>
          <h2 id="bank-transactions-title" className={styles.title}>
            <i className={`ti ti-receipt ${styles.titleIcon}`} aria-hidden />
            Bank Transactions
          </h2>
          {!compact ? (
            <p className={styles.sub}>
              Choose a period to view transactions. Sync or import for analysis when you are ready.
            </p>
          ) : (
            <p className={styles.sub}>Pick a period to view or sync transactions</p>
          )}
        </div>
        {shown ? (
          <button type="button" className={styles.hideBtn} onClick={onHideTransactions}>
            Hide transactions
          </button>
        ) : null}
      </div>

      <div className={styles.rangeBar}>
        <label className={styles.rangeField}>
          <span className={styles.rangeLabel}>Period</span>
          <select
            className={styles.rangeSelect}
            value={preset}
            onChange={(e) => onPresetChange(e.target.value as StatementRangePreset)}
            disabled={loading}
          >
            {STATEMENT_RANGE_OPTIONS.map((opt) => (
              <option key={opt.preset} value={opt.preset}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {preset === 'custom' ? (
          <>
            <div className={styles.customGroup}>
              <span className={styles.rangeLabel}>From</span>
              <div className={styles.customRow}>
                <select
                  className={styles.rangeSelect}
                  value={custom.startMonth}
                  onChange={(e) => setCustomPart({ startMonth: Number(e.target.value) })}
                  disabled={loading}
                >
                  {MONTHS.map((name, i) => (
                    <option key={name} value={i + 1}>
                      {name}
                    </option>
                  ))}
                </select>
                <select
                  className={styles.rangeSelect}
                  value={custom.startYear}
                  onChange={(e) => setCustomPart({ startYear: Number(e.target.value) })}
                  disabled={loading}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.customGroup}>
              <span className={styles.rangeLabel}>To</span>
              <div className={styles.customRow}>
                <select
                  className={styles.rangeSelect}
                  value={custom.endMonth}
                  onChange={(e) => setCustomPart({ endMonth: Number(e.target.value) })}
                  disabled={loading}
                >
                  {MONTHS.map((name, i) => (
                    <option key={name} value={i + 1}>
                      {name}
                    </option>
                  ))}
                </select>
                <select
                  className={styles.rangeSelect}
                  value={custom.endYear}
                  onChange={(e) => setCustomPart({ endYear: Number(e.target.value) })}
                  disabled={loading}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        ) : (
          <p className={styles.rangeSummary}>
            {loading || syncing
              ? `Loading ${statementRangeLabel(activeRange)}…`
              : `Showing ${statementRangeLabel(activeRange)}`}
          </p>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => void onSync()}
            disabled={!businessId || loading || syncing || importing || !customValid}
          >
            <i className={`ti ${syncing ? 'ti-loader-2' : 'ti-refresh'}`} aria-hidden />
            {syncing ? 'Syncing…' : 'Sync'}
          </button>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => void onImportForAnalysis()}
            disabled={
              !businessId || loading || syncing || importing || !customValid || transactions.length === 0
            }
          >
            <i className={`ti ${importing ? 'ti-loader-2' : 'ti-database-import'}`} aria-hidden />
            {importing ? 'Importing…' : 'Import for analysis'}
          </button>
        </div>
      </div>

      {error ? (
        <p className={styles.err} role="alert">
          {error}
        </p>
      ) : null}
      {hint ? (
        <p className={styles.hint} role="status">
          {hint}
        </p>
      ) : null}

      {loading || syncing ? (
        <p className={styles.muted}>Loading bank transactions…</p>
      ) : transactions.length === 0 ? (
        <div className={styles.empty}>
          <i className={`ti ti-receipt ${styles.emptyIcon}`} aria-hidden />
          <p className={styles.emptyTitle}>No transactions in this period</p>
          <p className={styles.emptyBody}>
            Try Sync, or pick a wider period if nothing shows for these dates.
          </p>
        </div>
      ) : (
        <ul className={styles.list}>
          {transactions.map((tx) => {
            const amt = typeof tx.amount === 'number' ? tx.amount : Number(tx.amount);
            const outflow = Number.isFinite(amt) && amt > 0;
            return (
              <li key={tx.transaction_id} className={styles.card}>
                <span className={styles.icon} aria-hidden>
                  <i className={`ti ${outflow ? 'ti-arrow-up-right' : 'ti-arrow-down-left'}`} />
                </span>
                <div className={styles.main}>
                  <div className={styles.period}>{txTitle(tx)}</div>
                  <div className={styles.bank}>{tx.date}</div>
                  <div className={styles.meta}>
                    {txCategory(tx)}
                    {tx.pending ? ' · Pending' : ''}
                  </div>
                </div>
                <div className={`${styles.amount} ${outflow ? styles.out : styles.in}`}>
                  {formatMoney(tx.amount, tx.iso_currency_code)}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
