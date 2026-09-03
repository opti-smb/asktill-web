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
      const cached = loadPlaidBankMetrics(uid);
      if (cached) setMetrics(cached);

      try {
        const accounts = await fetchLinkedBankAccounts(businessId);
        if (cancelled) return;
        if (!accounts.length) {
          clearPlaidBankMetrics(uid);
          setMetrics(null);
          await restoreUploadDashboardBaseline(uid);
          return;
        }

        const cacheAgeMs = cached?.updatedAt
          ? Date.now() - new Date(cached.updatedAt).getTime()
          : Number.POSITIVE_INFINITY;
        if (!cached) {
          const stored = await loadPlaidMetricsFromStoredReports('realtime');
          if (!cancelled && stored) {
            savePlaidBankMetrics(uid, stored);
            setMetrics(stored);
          }
        }

        if (Number.isFinite(cacheAgeMs) && cacheAgeMs < 120_000) {
          void ensureUploadBaselineSession(uid);
          return;
        }

        const live = await refreshPlaidBankMetricsOverlay(businessId, uid, {
          sync: false,
          persist: false,
          recordPull: false,
          mode: loadPlaidBankMetrics(uid)?.linkMode ?? 'realtime',
        });
        void ensureUploadBaselineSession(uid);
        if (!cancelled) setMetrics(live ?? loadPlaidBankMetrics(uid) ?? cached);
      } catch {
        if (!cancelled) {
          setMetrics(loadPlaidBankMetrics(uid) ?? cached);
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
