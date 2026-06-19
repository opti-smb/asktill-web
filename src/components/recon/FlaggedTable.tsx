import { useMemo, useRef, useState } from 'react';
import { reconTransactions } from '../../data/recon';
import type { ReconciliationUiApi } from '../../lib/analyzeResponse';
import styles from './FlaggedTable.module.css';

interface Props {
  reconciliation?: ReconciliationUiApi | null;
  hasLiveAnalysis?: boolean;
}

type TxStatus = 'flagged' | 'pending' | 'cash' | 'prior';
type TxFilter = 'all' | TxStatus;

type TxRow = {
  date: string;
  source: string;
  meta: string;
  status: TxStatus;
  statusLabel: string;
  description: string;
  amount: string;
  amountType: 'neg' | 'warn' | 'neutral';
  action?: string;
};

export default function FlaggedTable({ reconciliation }: Props) {
  const tableRef = useRef<HTMLDivElement>(null);
  const [activeFilter, setActiveFilter] = useState<TxFilter>('all');

  const useDemo = false;

  const allRows: TxRow[] = useMemo(() => {
    if (reconciliation?.transactions?.length) {
      return reconciliation.transactions.map((tx) => ({
        date: tx.date,
        source: tx.source,
        meta: tx.meta,
        status: tx.status as TxStatus,
        statusLabel: tx.status_label,
        description: tx.description,
        amount: tx.amount,
        amountType: tx.amount_type as 'neg' | 'warn' | 'neutral',
        action: tx.action,
      }));
    }
    if (useDemo) {
      return reconTransactions.map((tx) => ({
        ...tx,
        amountType: tx.amountType as 'neg' | 'warn' | 'neutral',
      }));
    }
    return [];
  }, [reconciliation, useDemo]);

  const flaggedCount =
    reconciliation?.flagged_filter_count ?? allRows.filter((tx) => tx.status === 'flagged').length;
  const pendingCount =
    reconciliation?.pending_filter_count ?? allRows.filter((tx) => tx.status === 'pending').length;
  const cashCount =
    reconciliation?.cash_filter_count ?? allRows.filter((tx) => tx.status === 'cash').length;
  const priorCount =
    reconciliation?.prior_month_count ?? allRows.filter((tx) => tx.status === 'prior').length;

  const visibleRows = useMemo(() => {
    if (activeFilter === 'all') return allRows;
    return allRows.filter((tx) => tx.status === activeFilter);
  }, [activeFilter, allRows]);

  const setFilter = (filter: TxFilter) => {
    setActiveFilter(filter);
    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const filters: { id: TxFilter; label: string; count: number; show: boolean }[] = [
    { id: 'all', label: 'All', count: allRows.length, show: true },
    { id: 'flagged', label: 'Flagged', count: flaggedCount, show: flaggedCount > 0 },
    { id: 'pending', label: 'Pending', count: pendingCount, show: pendingCount > 0 },
    { id: 'cash', label: 'Cash', count: cashCount, show: cashCount > 0 },
    { id: 'prior', label: 'Prior month', count: priorCount, show: priorCount > 0 },
  ];

  return (
    <div className={styles.txSection} ref={tableRef}>
      <div className={styles.txHeader}>
        <div className={styles.txTitle}>Items <em>needing your attention</em></div>
        <div className={styles.txFilterRow}>
          {filters
            .filter((f) => f.show)
            .map((f) => (
              <button
                key={f.id}
                type="button"
                className={`${styles.txFilter} ${activeFilter === f.id ? styles.active : ''}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label} ({f.count})
              </button>
            ))}
        </div>
      </div>

      {visibleRows.length === 0 ? (
        <p className={styles.txEmpty}>
          {allRows.length === 0
            ? 'No items need attention for this period.'
            : `No ${activeFilter === 'all' ? '' : activeFilter} items in this view.`}
        </p>
      ) : (
        <table className={styles.txTable}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Source / Description</th>
              <th>Status</th>
              <th>What AskTill saw</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((tx, i) => (
              <tr key={`${tx.status}-${tx.source}-${i}`}>
                <td>{tx.date}</td>
                <td>
                  <strong style={{ color: 'var(--ink)' }}>{tx.source}</strong>
                  <div className={styles.txMeta}>{tx.meta}</div>
                </td>
                <td>
                  <span className={`${styles.txStatus} ${styles[tx.status]}`}>
                    ●&nbsp;&nbsp;{tx.statusLabel}
                  </span>
                </td>
                <td>{tx.description}</td>
                <td style={{ textAlign: 'right' }}>
                  <span
                    className={styles.txAmount}
                    style={{
                      color:
                        tx.amountType === 'neg'
                          ? 'var(--neg)'
                          : tx.amountType === 'neutral'
                            ? '#B45309'
                            : 'var(--warn)',
                    }}
                  >
                    {tx.amount}
                  </span>
                </td>
                <td>
                  {tx.action && tx.action !== 'Noted' ? (
                    <a className={styles.txLink} href="#">{tx.action}</a>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
