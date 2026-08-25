import { useEffect, useState } from 'react';

import {
  clearPlaidBankMetrics,
  ensureUploadBaselineSession,
  loadPlaidBankMetrics,
  loadPlaidMetricsFromStoredReports,
  PLAID_BANK_METRICS_EVENT,
  refreshPlaidBankMetricsOverlay,
  restoreUploadDashboardBaseline,
  savePlaidBankMetrics,
  type PlaidBankMetrics,
} from '../lib/plaidBankMetrics';
import { businessIdFromUser, fetchLinkedBankAccounts } from '../lib/plaidClient';

/**
 * Live bank KPI overlay — refreshes from Plaid on load while banks are linked.
 * No linked banks → clear overlay and reload saved upload dashboard.
 */
export function usePlaidBankMetrics(
  userId: string | null | undefined,
): PlaidBankMetrics | null {
  const [metrics, setMetrics] = useState<PlaidBankMetrics | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!userId?.trim()) {
      setMetrics(null);
      return undefined;
    }

    const uid = userId.trim();
    const businessId = businessIdFromUser(uid);

    const sync = async () => {
      try {
        const accounts = await fetchLinkedBankAccounts(businessId);
        if (cancelled) return;
        if (!accounts.length) {
          clearPlaidBankMetrics(uid);
          setMetrics(null);
          await restoreUploadDashboardBaseline(uid);
          return;
        }

        const cached = loadPlaidBankMetrics(uid);
        if (cached) setMetrics(cached);
        else {
          const stored = await loadPlaidMetricsFromStoredReports('realtime');
          if (!cancelled && stored) {
            savePlaidBankMetrics(uid, stored);
            setMetrics(stored);
          }
        }

        const live = await refreshPlaidBankMetricsOverlay(businessId, uid, {
          sync: true,
          persist: true,
          recordPull: false,
          mode: loadPlaidBankMetrics(uid)?.linkMode ?? 'realtime',
        });
        await ensureUploadBaselineSession(uid);
        if (!cancelled) setMetrics(live ?? cached);
      } catch {
        if (!cancelled) {
          setMetrics(loadPlaidBankMetrics(uid));
        }
      }
    };

    void sync();

    const onUpdate = (event: Event) => {
      const detail = (event as CustomEvent<PlaidBankMetrics | null>).detail;
      if (detail === null) {
        setMetrics(null);
        return;
      }
      setMetrics(detail ?? loadPlaidBankMetrics(uid));
    };
    window.addEventListener(PLAID_BANK_METRICS_EVENT, onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener(PLAID_BANK_METRICS_EVENT, onUpdate);
    };
  }, [userId]);

  return metrics;
}
