import { reconTransactions } from '../../data/recon';
import styles from './FlaggedTable.module.css';

export default function FlaggedTable() {
  return (
    <div className={styles.txSection}>
      <div className={styles.txHeader}>
        <div className={styles.txTitle}>Items <em>needing your attention</em></div>
        <div className={styles.txFilterRow}>
          <button className={`${styles.txFilter} ${styles.active}`}>Flagged (3)</button>
          <button className={styles.txFilter}>Pending (8)</button>
          <button className={styles.txFilter}>All</button>
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
          {reconTransactions.map((tx, i) => (
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
                  style={{ color: tx.amountType === 'neg' ? 'var(--neg)' : 'var(--warn)' }}
                >
                  {tx.amount}
                </span>
              </td>
              <td>
                <a className={styles.txLink} href="#">{tx.action}</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
