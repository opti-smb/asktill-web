import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useOutletContext, useParams } from 'react-router-dom';

import { listDisputeCases, type DisputeCaseRow } from '../lib/chargebacksClient';
import { getEvidencePacket } from './api';
import styles from './cb5.module.css';
import headerStyles from '../components/layout/SectionHeader.module.css';
import type { PacketOverview } from './types';

export type EvidenceOutlet = {
  caseId: string;
  row: DisputeCaseRow | null;
  packet: PacketOverview | null;
  error: string | null;
  loading: boolean;
  reload: () => Promise<void>;
};

function money(amount?: number | null, currency?: string | null): string {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: (currency || 'usd').toUpperCase(),
    }).format(amount);
  } catch {
    return `$${amount}`;
  }
}

export function useEvidenceOutlet(): EvidenceOutlet {
  return useOutletContext<EvidenceOutlet>();
}

export default function EvidenceWorkspace() {
  const { caseId = '' } = useParams();
  const [row, setRow] = useState<DisputeCaseRow | null>(null);
  const [packet, setPacket] = useState<PacketOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    try {
      const cases = await listDisputeCases();
      const found = cases.find((item) => item.case_id === caseId) || null;
      setRow(found);
      try {
        setPacket(await getEvidencePacket(caseId));
      } catch (err) {
        const status = (err as Error & { status?: number }).status;
        if (status === 404) setPacket(null);
        else throw err;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load evidence.');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const tabs = useMemo(() => {
    const enabled = packet?.tabs;
    return [
      { to: '', label: 'Overview', show: true },
      { to: 'order', label: 'Order', show: enabled?.order !== false },
      { to: 'delivery', label: 'Delivery', show: enabled?.delivery === true },
      { to: 'service', label: 'Service', show: enabled?.service === true },
      { to: 'policy', label: 'Policy', show: enabled?.policy !== false },
      { to: 'lineage', label: 'Lineage', show: true },
    ];
  }, [packet]);

  const base = `/dashboard/chargebacks/decision/${encodeURIComponent(caseId)}/evidence`;

  return (
    <div className={styles.page}>
      <div className={styles.main}>
        <Link to={`/dashboard/chargebacks/decision/${encodeURIComponent(caseId)}`} className={styles.back}>
          ← Decision (CB4)
        </Link>
        <h1 className={headerStyles.h1}>Evidence</h1>
        <p className={styles.lead}>
          CB5 assembles factual evidence into a versioned packet. It does not submit anything to Stripe.
        </p>
        <p className={styles.meta}>
          {money(row?.amount ?? packet?.amount, row?.currency ?? packet?.currency)} ·{' '}
          {(row?.reason || packet?.reason || 'reason').replace(/_/g, ' ')} · deadline{' '}
          {row?.response_deadline || packet?.deadline || '—'}
          {packet ? ` · packet v${packet.packet_version}` : ''}
        </p>
        <nav className={styles.tabs}>
          {tabs.map((tab) =>
            tab.show ? (
              <NavLink
                key={tab.label}
                to={tab.to ? `${base}/${tab.to}` : base}
                end={!tab.to}
                className={({ isActive }) => (isActive ? styles.tabActive : styles.tab)}
              >
                {tab.label}
              </NavLink>
            ) : (
              <span key={tab.label} className={styles.tabDisabled}>
                {tab.label} N/A
              </span>
            ),
          )}
          <span className={styles.tabDisabled}>Submission (CB6)</span>
        </nav>
        {error ? <p className={styles.error}>{error}</p> : null}
        <Outlet context={{ caseId, row, packet, error, loading, reload } satisfies EvidenceOutlet} />
      </div>
    </div>
  );
}
