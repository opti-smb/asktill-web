import LinkedBanksPanel from '../components/sources/LinkedBanksPanel';

import styles from './LinkedAccountsPage.module.css';

/** Dashboard Linked Accounts — connected banks only. Statements & transactions live on Connect Accounts / upload. */
export default function LinkedAccountsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.intro}>
        <h1 className={styles.title}>Linked Accounts</h1>
        <p className={styles.sub}>
          Banks connected with Link Bank. To view statements or transactions for a period, open{' '}
          <strong>Connect Accounts</strong> (upload).
        </p>
      </div>
      <LinkedBanksPanel />
    </div>
  );
}
