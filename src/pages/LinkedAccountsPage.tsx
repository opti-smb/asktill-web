import { useNavigate } from 'react-router-dom';
import LinkedBanksPanel from '../components/sources/LinkedBanksPanel';
import { DEFAULT_DASHBOARD_PATH } from '../lib/pendingPdfDownload';
import styles from './LinkedAccountsPage.module.css';

/** Dashboard Linked Accounts — connected banks only; uploads stay on Connect Accounts. */
export default function LinkedAccountsPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className={styles.intro}>
        <h1 className={styles.title}>Linked Accounts</h1>
        <p className={styles.sub}>
          Banks connected with Link Bank. We pull statements and transactions in the background —
          results appear on your <strong>dashboard</strong>, not here.
        </p>
      </div>
      <LinkedBanksPanel
        onImported={() => {
          navigate(DEFAULT_DASHBOARD_PATH);
        }}
      />
    </div>
  );
}
