import { useCallback, useEffect, useState } from 'react';
import { ChargebacksApp } from '@asktill/chargebacks';
import StripeConnectBar from '../components/chargebacks/StripeConnectBar';
import ShopifyConnectBar from '../components/chargebacks/ShopifyConnectBar';
import DisputeCasesTable from '../components/chargebacks/DisputeCasesTable';
import { useAuth } from '../context/AuthContext';
import {
  getStripeConnection,
  listDisputeCases,
  readCachedDisputeCases,
  writeCachedDisputeCases,
  type DisputeCaseRow,
  type StripeDisputeRow,
} from '../lib/chargebacksClient';
import styles from './AtChargebacksPage.module.css';
import headerStyles from '../components/layout/SectionHeader.module.css';

const wideStyle = {
  width: 'calc(100vw - var(--sidebar-width, 220px))',
  maxWidth: 'none',
} as const;

function caseToDispute(row: DisputeCaseRow): StripeDisputeRow {
  const created = row.created_at ? Date.parse(row.created_at) : NaN;
  return {
    id: row.stripe_dispute_id || row.case_id,
    amount: typeof row.amount === 'number' ? row.amount : undefined,
    currency: row.currency ?? undefined,
    status: row.status ?? undefined,
    reason: row.reason ?? undefined,
    created: Number.isFinite(created) ? Math.floor(created / 1000) : undefined,
    fought: (row.decision_status || '').toLowerCase() === 'fight_approved',
  };
}

/** Dashboard Money Reclaimed — Dispute protection overview. */
export default function AtChargebacksPage() {
  const { user } = useAuth();
  const userId = user?.userId;
  const name = user?.name?.trim() || user?.businessName?.trim() || null;
  const [cases, setCases] = useState<DisputeCaseRow[]>(() => readCachedDisputeCases(userId));
  const [disputes, setDisputes] = useState<StripeDisputeRow[]>(() =>
    readCachedDisputeCases(userId).map(caseToDispute),
  );
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const applyCases = useCallback(
    (rows: DisputeCaseRow[]) => {
      setCases(rows);
      setDisputes(rows.map(caseToDispute));
      writeCachedDisputeCases(userId, rows);
    },
    [userId],
  );

  const patchCase = useCallback(
    (next: DisputeCaseRow) => {
      setCases((prev) => {
        const rows = prev.map((row) => (row.case_id === next.case_id ? next : row));
        setDisputes(rows.map(caseToDispute));
        writeCachedDisputeCases(userId, rows);
        return rows;
      });
    },
    [userId],
  );

  useEffect(() => {
    if (!userId) return;
    const cached = readCachedDisputeCases(userId);
    if (!cached.length) return;
    setCases((prev) => (prev.length ? prev : cached));
    setDisputes((prev) => (prev.length ? prev : cached.map(caseToDispute)));
  }, [userId]);

  const refreshDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const listedP = listDisputeCases()
        .then((rows) => {
          if (rows.length > 0) applyCases(rows);
        })
        .catch(() => undefined);
      const connP = getStripeConnection()
        .then((conn) => {
          setConnected(conn.status === 'active');
        })
        .catch(() => undefined);
      await Promise.all([listedP, connP]);
    } finally {
      setLoading(false);
    }
  }, [applyCases]);

  useEffect(() => {
    void refreshDisputes();
  }, [refreshDisputes]);

  return (
    <div className={styles.chargePage} style={wideStyle}>
      <div className={styles.main}>
        <div className={styles.fullWrap}>
          <div className={styles.titleChrome}>
            <div className={headerStyles.headerRow}>
              <div>
                <h1 className={headerStyles.h1}>
                  <span className={styles.titleAccent}>Money Reclaimed.</span>
                </h1>
              </div>
            </div>
          </div>
          <div className={styles.scrollViewport}>
            <StripeConnectBar onChanged={() => void refreshDisputes()} />
            <ShopifyConnectBar onChanged={() => void refreshDisputes()} />
            <DisputeCasesTable cases={cases} loading={loading} onChanged={patchCase} />
            <ChargebacksApp userName={name} disputes={disputes} connected={connected} loading={loading} />
          </div>
        </div>
      </div>
    </div>
  );
}
