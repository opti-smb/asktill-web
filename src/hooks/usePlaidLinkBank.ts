import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  alreadyLinkedBankMessage,
  businessIdFromUser,
  createLinkToken,
  exchangePublicToken,
  fetchLinkedBankAccounts,
  findDuplicatePlaidLink,
  findSameLinkedBank,
  institutionFromPlaidMeta,
  warmupPlaidService,
  type LinkedBankAccount,
  type PlaidLinkMode,
} from '../lib/plaidClient';
import {
  ensureUploadBaselineSession,
  refreshPlaidBankMetricsOverlay,
} from '../lib/plaidBankMetrics';
import { plaidLinkStatusText } from '../lib/plaidLinkStatus';

type PlaidHandler = {
  open: () => void;
  destroy: () => void;
  exit: (options?: { force?: boolean }) => void;
};

type PlaidEventMetadata = {
  institution_id?: string;
  institution_name?: string;
  institution?: { institution_id?: string; name?: string };
};

type LinkIntent = 'link' | 'sync';

type UsePlaidLinkBankOptions = {
  onDataReady?: () => void;
};

declare global {
  interface Window {
    Plaid?: {
      create: (config: Record<string, unknown>) => PlaidHandler;
    };
  }
}

let plaidScriptPromise: Promise<void> | null = null;

function loadPlaidScript() {
  if (window.Plaid) return Promise.resolve();
  if (plaidScriptPromise) return plaidScriptPromise;
  plaidScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Plaid Link failed to load'));
    document.head.appendChild(script);
  });
  return plaidScriptPromise;
}

/** Overlay Plaid Money In / Out on the saved upload — do not replace the brief with a bank-only ingest. */
async function pullAndOverlay(businessId: string, userId: string, mode: PlaidLinkMode) {
  const metrics = await refreshPlaidBankMetricsOverlay(businessId, userId, {
    sync: true,
    mode,
    persist: true,
    recordPull: true,
  });
  void ensureUploadBaselineSession(userId);
  if (!metrics) {
    throw new Error(
      'Bank is linked, but there are no live transactions for this month yet. Try syncing again in a minute.',
    );
  }
  return metrics;
}

export function usePlaidLinkBank(options: UsePlaidLinkBankOptions = {}) {
  const { onDataReady } = options;
  const { user, isAuth } = useAuth();
  const [accounts, setAccounts] = useState<LinkedBankAccount[]>([]);
  const [linking, setLinking] = useState(false);
  const [linkingMode, setLinkingMode] = useState<PlaidLinkMode | null>(null);
  const [linkStatus, setLinkStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const handlerRef = useRef<PlaidHandler | null>(null);
  const accountsRef = useRef<LinkedBankAccount[]>([]);
  const blockedSameBankRef = useRef<string | null>(null);
  accountsRef.current = accounts;

  const businessId = user?.userId ? businessIdFromUser(user.userId) : '';
  const canLink = Boolean(isAuth && businessId);

  const refreshAccounts = useCallback(async () => {
    if (!businessId) return [] as LinkedBankAccount[];
    const next = await fetchLinkedBankAccounts(businessId);
    setAccounts(next);
    accountsRef.current = next;
    return next;
  }, [businessId]);

  useEffect(() => {
    if (!canLink) return;
    void warmupPlaidService();
    void refreshAccounts().catch(() => undefined);
  }, [canLink, refreshAccounts]);

  const connectBank = useCallback(
    async (mode: PlaidLinkMode, intent: LinkIntent = 'sync') => {
      if (!businessId || !user?.userId) {
        setError('Sign in to connect a bank.');
        return;
      }
      setError(null);
      setLinking(true);
      setLinkingMode(mode);
      blockedSameBankRef.current = null;
      void warmupPlaidService();

      try {
        const existing = await refreshAccounts();

        // Already linked: Connect real-time / monthly pulls data, it does not open Link again.
        if (intent === 'sync' && existing.length > 0) {
          try {
            setLinkStatus('Starting bank sync…');
            await warmupPlaidService();
            setLinkStatus(
              mode === 'monthly'
                ? 'Pulling your previous month bank statement…'
                : 'Loading live bank transactions…',
            );
            const metrics = await pullAndOverlay(businessId, user.userId, mode);
            setLinkStatus(
              metrics
                ? mode === 'monthly'
                  ? 'Previous month statement pulled. Money In / Out updated from your linked bank.'
                  : 'Live transactions synced. Money In / Out updated from your linked bank.'
                : 'Nothing new to pull yet. Try again shortly.',
            );
            if (metrics) onDataReady?.();
          } catch (err) {
            const raw = err instanceof Error ? err.message : 'Could not sync the linked bank.';
            setError(raw);
            setLinkStatus(null);
          } finally {
            setLinking(false);
            setLinkingMode(null);
          }
          return;
        }

        setLinkStatus('Opening your bank login…');
        await loadPlaidScript();
        const token = await createLinkToken(businessId, mode);
        handlerRef.current?.destroy();

        const existingAtLinkStart = existing;

        const handler = window.Plaid!.create({
          token: token.link_token,
          onEvent: (eventName: string, metadata: PlaidEventMetadata) => {
            const status = plaidLinkStatusText(eventName);
            if (status && !blockedSameBankRef.current) setLinkStatus(status);

            if (eventName !== 'SELECT_INSTITUTION' && eventName !== 'OPEN_OAUTH') {
              return;
            }
            if (!existingAtLinkStart.length) return;

            const { institutionId, institutionName } = institutionFromPlaidMeta(metadata);
            const match = findSameLinkedBank(
              existingAtLinkStart,
              institutionId,
              institutionName,
            );
            if (!match) return;

            const message = alreadyLinkedBankMessage(
              institutionName || match.institution_name,
            );
            blockedSameBankRef.current = message;
            setError(message);
            setLinkStatus(message);
            handler.exit({ force: true });
          },
          onExit: (err: { display_message?: string; error_message?: string } | null) => {
            handler.destroy();
            handlerRef.current = null;
            setLinking(false);
            setLinkingMode(null);
            const blocked = blockedSameBankRef.current;
            if (blocked) {
              setError(blocked);
              setLinkStatus(blocked);
              return;
            }
            setLinkStatus(null);
            if (err) setError(err.display_message || err.error_message || 'Bank link was cancelled.');
          },
          onSuccess: async (
            publicToken: string,
            metadata: PlaidEventMetadata & {
              accounts?: Array<{
                id?: string;
                name?: string | null;
                mask?: string | null;
                type?: string | null;
                subtype?: string | null;
              }>;
            },
          ) => {
            try {
              if (blockedSameBankRef.current) {
                setError(blockedSameBankRef.current);
                return;
              }

              const duplicateMsg = existingAtLinkStart.length
                ? findDuplicatePlaidLink(existingAtLinkStart, metadata)
                : null;
              if (duplicateMsg) {
                blockedSameBankRef.current = duplicateMsg;
                setError(duplicateMsg);
                setLinkStatus(duplicateMsg);
                return;
              }

              setLinkStatus(
                mode === 'monthly' ? 'Connecting monthly sync…' : 'Saving the connection…',
              );
              await exchangePublicToken(businessId, publicToken, metadata?.institution);
              setLinkStatus(
                mode === 'monthly'
                  ? 'Pulling your previous month bank statement…'
                  : 'Loading live bank transactions…',
              );
              await pullAndOverlay(businessId, user.userId, mode);
              await refreshAccounts();
              setLinkStatus(
                mode === 'monthly'
                  ? 'Bank linked — previous month statement pulled.'
                  : 'Bank linked — live transactions synced. Money In / Out updated from your bank.',
              );
              onDataReady?.();
            } catch (err) {
              const raw = err instanceof Error ? err.message : 'Could not finish bank link.';
              setError(raw);
            } finally {
              handler.destroy();
              handlerRef.current = null;
              setLinking(false);
              setLinkingMode(null);
            }
          },
        });
        handlerRef.current = handler;
        handler.open();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not open Plaid Link.';
        setError(message);
        setLinking(false);
        setLinkingMode(null);
        setLinkStatus(null);
      }
    },
    [businessId, onDataReady, refreshAccounts, user?.userId],
  );

  return {
    accounts,
    bankLinked: accounts.length > 0,
    canLink,
    linking,
    linkingMode,
    linkStatus,
    error,
    /** Connect Accounts: first time opens Link; later clicks pull/sync only. */
    connectRealtime: () => void connectBank('realtime', 'sync'),
    connectMonthly: () => void connectBank('monthly', 'sync'),
    /** Linked Accounts: always open Link to add a bank; same bank is blocked. */
    connectNewBank: () => void connectBank('realtime', 'link'),
    refreshAccounts,
  };
}
