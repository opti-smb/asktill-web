import { reconTransactions } from '../../data/recon';
import type { ReconciliationUiApi } from '../../lib/analyzeResponse';
import styles from './FlaggedTable.module.css';

interface Props {
  reconciliation?: ReconciliationUiApi | null;
}

type TxStatus = 'flagged' | 'pending' | 'cash';

export default function FlaggedTable({ reconciliation }: Props) {
  const rows = reconciliation?.transactions?.length
    ? reconciliation.transactions.map((tx) => ({
        date: tx.date,
        source: tx.source,
        meta: tx.meta,
        status: tx.status as TxStatus,
        statusLabel: tx.status_label,
        description: tx.description,
        amount: tx.amount,
        amountType: tx.amount_type as 'neg' | 'warn' | 'neutral',
        action: tx.action,
      }))
    : reconTransactions.map((tx) => ({ ...tx, amountType: tx.amountType as 'neg' | 'warn' | 'neutral' }));

  const flaggedCount = reconciliation?.flagged_filter_count ?? rows.filter((tx) => tx.status === 'flagged').length;
  const pendingCount = reconciliation?.pending_filter_count ?? rows.filter((tx) => tx.status === 'pending').length;
  const cashCount = reconciliation?.cash_filter_count ?? rows.filter((tx) => tx.status === 'cash').length;

  return (
    <div className={styles.txSection}>
      <div className={styles.txHeader}>
        <div className={styles.txTitle}>Items <em>needing your attention</em></div>
        <div className={styles.txFilterRow}>
          <button className={`${styles.txFilter} ${styles.active}`}>Flagged ({flaggedCount})</button>
          {cashCount > 0 ? <button className={styles.txFilter}>Cash ({cashCount})</button> : null}
          <button className={styles.txFilter}>Pending ({pendingCount})</button>
          <button className={styles.txFilter}>All ({rows.length})</button>
        </div>
      </div>

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
          {rows.map((tx, i) => (
            <tr key={i}>
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
    </div>
  );
}
