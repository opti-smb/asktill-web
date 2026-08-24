import { useCallback, useState } from 'react';



import {

  ensureUploadBaselineSession,
  loadPlaidBankMetrics,
  previousCalendarMonthRequest,
  refreshPlaidBankMetricsOverlay,
  type PlaidLinkMode,
} from '../lib/plaidBankMetrics';

import {

  businessIdFromUser,
  clearStatementConsentSkipped,
  createStatementsUpdateLinkToken,
  alreadyLinkedBankMessage,
  fetchLinkedBankAccounts,
  findDuplicatePlaidLink,
  findSameLinkedBank,
  markStatementConsentSkipped,
  plaidJson,
  pullBankStatements,
  statementConsentSkipped,
  statementItemIdsNeedingConsent,
  statementPullNeedsConsent,
  type PlaidLinkOnSuccessMetadata,
} from '../lib/plaidClient';



type PlaidHandler = {

  open: () => void;
  exit: (options?: { force?: boolean }) => void;
  destroy: () => void;

};



type PlaidLinkEventMetadata = {
  institution_id?: string;
  institution_name?: string;
  institution?: {
    institution_id?: string;
    name?: string;
  };
};

type PlaidCreate = {

  create: (opts: {

    token: string;

    onSuccess: (publicToken: string, metadata?: unknown) => void | Promise<void>;
    onExit?: (err: unknown) => void;
    onEvent?: (eventName: string, metadata: PlaidLinkEventMetadata) => void;

  }) => PlaidHandler;

};



declare global {

  interface Window {

    Plaid?: PlaidCreate;

  }

}



function loadPlaidScript(): Promise<PlaidCreate> {

  if (window.Plaid) return Promise.resolve(window.Plaid);

  return new Promise((resolve, reject) => {

    const existing = document.querySelector('script[data-asktill-plaid]');

    if (existing) {

      existing.addEventListener('load', () => {

        if (window.Plaid) resolve(window.Plaid);

        else reject(new Error('Bank link did not load'));

      });

      existing.addEventListener('error', () => reject(new Error('Bank link did not load')));

      return;

    }

    const script = document.createElement('script');

    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';

    script.async = true;

    script.dataset.asktillPlaid = '1';

    script.onload = () => {

      if (window.Plaid) resolve(window.Plaid);

      else reject(new Error('Bank link did not load'));

    };

    script.onerror = () => reject(new Error('Bank link did not load'));

    document.head.appendChild(script);

  });

}



function openPlaidConsent(Plaid: PlaidCreate, linkToken: string): Promise<boolean> {

  return new Promise((resolve) => {

    const handler = Plaid.create({

      token: linkToken,

      onSuccess: () => {

        handler.destroy();

        resolve(true);

      },

      onExit: () => {

        handler.destroy();

        resolve(false);

      },

    });

    handler.open();

  });

}



/** Pull previous month statement PDFs (monthly banks publish one stmt per prior month). */

async function ensurePreviousMonthStatementPdfs(

  Plaid: PlaidCreate,

  businessId: string,

): Promise<{

  statements: Awaited<ReturnType<typeof pullBankStatements>>['statements'];

  range: ReturnType<typeof previousCalendarMonthRequest>;

}> {

  const range = previousCalendarMonthRequest();

  let pulled = await pullBankStatements(businessId, range);

  if (pulled.statements.length > 0 || !statementPullNeedsConsent(pulled.results)) {

    return { statements: pulled.statements, range };

  }

  if (statementConsentSkipped(businessId)) {

    return { statements: pulled.statements, range };

  }



  const itemIds = statementItemIdsNeedingConsent(pulled.results);

  const targets = itemIds.length ? itemIds : [undefined];



  for (const itemId of targets) {

    const { link_token } = await createStatementsUpdateLinkToken(businessId, itemId);

    const ok = await openPlaidConsent(Plaid, link_token);

    if (!ok) {

      markStatementConsentSkipped(businessId);

      break;

    }

  }



  pulled = await pullBankStatements(businessId, range);

  if (pulled.statements.length > 0) {

    clearStatementConsentSkipped(businessId);

  }

  return { statements: pulled.statements, range };

}



export type PlaidLinkResult = {

  mode: PlaidLinkMode;

  bankMetricsUpdated: boolean;

};



type AfterLinkContext = {
  /** Sync/pull on an existing link — no new Plaid item. */
  pullOnly?: boolean;
  /** Plaid Link added another bank while others remain linked. */
  additionalLink?: boolean;
};

type LinkBankOptions = {
  /** `sync` — refresh data on linked banks; `link` — open Plaid Link for another bank. */
  intent?: 'sync' | 'link';
};

type Options = {

  onLinked?: (result: PlaidLinkResult) => void;

};



export function usePlaidLinkBank(userId: string | null | undefined, options?: Options) {

  const [busy, setBusy] = useState(false);
  const [linkingMode, setLinkingMode] = useState<PlaidLinkMode | null>(null);
  const [status, setStatus] = useState<string | null>(null);



  const businessId = userId?.trim() ? businessIdFromUser(userId) : null;

  const onLinked = options?.onLinked;



  const fetchStatementsAfterLink = useCallback(

    async (
      Plaid: PlaidCreate,
      mode: PlaidLinkMode,
      context: AfterLinkContext = {},
    ): Promise<PlaidLinkResult & { message: string }> => {
      const { pullOnly = false, additionalLink = false } = context;
      clearStatementConsentSkipped(businessId!);

      setStatus(

        mode === 'monthly'

          ? 'Pulling your previous month bank statement…'

          : 'Syncing live bank transactions…',

      );



      if (mode === 'realtime') {

        await plaidJson(`/api/plaid/sync/${businessId!}`, businessId!, { method: 'POST' });

      } else {

        await ensurePreviousMonthStatementPdfs(Plaid, businessId!);

      }



      const metrics = userId?.trim()
        ? pullOnly && mode === 'monthly'
          ? loadPlaidBankMetrics(userId.trim())
          : await refreshPlaidBankMetricsOverlay(businessId!, userId.trim(), {
              sync: true,
              mode,
            })
        : null;



      if (metrics && userId?.trim() && !(pullOnly && mode === 'monthly')) {

        await ensureUploadBaselineSession(userId.trim());

      }



      if (metrics) {

        const statementPullOnly = pullOnly && mode === 'monthly';

        return {

          mode,

          bankMetricsUpdated: !statementPullOnly,

          message:

            mode === 'monthly'

              ? pullOnly

                ? 'Previous month statement PDF pulled. Dashboard still shows live month-to-date transactions.'

                : `Bank linked — showing ${metrics.periodLabel} statement.`

              : additionalLink

                ? `Another bank linked — live transactions updated (${metrics.periodLabel}).`

                : pullOnly

                  ? `Live transactions synced (${metrics.periodLabel}). Pull monthly statements when ready.`

                  : `Bank linked — live transactions updated (${metrics.periodLabel}). Pull monthly statements when ready.`,

        };

      }



      return {

        mode,

        bankMetricsUpdated: false,

        message:

          mode === 'monthly'

            ? pullOnly

              ? 'Previous month statement not ready yet. Try again shortly.'

              : 'Bank linked — previous month statement not ready yet. Try Refresh shortly.'

            : additionalLink

              ? 'Another bank linked — live transactions not ready yet. Try again shortly.'

              : pullOnly

                ? 'Live transactions not ready yet. Try again shortly.'

                : 'Bank linked — live transactions not ready yet. Try Refresh shortly.',

      };

    },

    [businessId, userId],

  );



  const linkBank = useCallback(

    async (mode: PlaidLinkMode = 'realtime', linkOptions?: LinkBankOptions) => {

      if (!businessId) {

        setStatus('Sign in to link a bank.');

        return;

      }

      setBusy(true);
      setLinkingMode(mode);
      setStatus(null);
      try {
        const existing = await fetchLinkedBankAccounts(businessId);
        const intent = linkOptions?.intent ?? (existing.length > 0 ? 'sync' : 'link');
        const Plaid = await loadPlaidScript();

        if (intent === 'sync' && existing.length > 0) {
          try {
            const linked = await fetchStatementsAfterLink(Plaid, mode, { pullOnly: true });
            setStatus(linked.message);
            onLinked?.({ mode: linked.mode, bankMetricsUpdated: linked.bankMetricsUpdated });
          } finally {
            setBusy(false);
            setLinkingMode(null);
          }
          return;
        }

        const hadExisting = existing.length > 0;

        const { link_token } = await plaidJson<{ link_token: string }>(

          '/api/plaid/link-token',

          businessId,

          {

            method: 'POST',

            body: JSON.stringify({ business_id: businessId, mode }),

          },

        );

        const existingAtLinkStart = existing;
        let blockedSameBankMessage: string | null = null;

        const handler = Plaid.create({

          token: link_token,

          onEvent: (eventName, metadata) => {
            if (
              (eventName !== 'SELECT_INSTITUTION' && eventName !== 'OPEN_OAUTH')
              || existingAtLinkStart.length === 0
            ) return;
            const match = findSameLinkedBank(
              existingAtLinkStart,
              metadata?.institution_id || metadata?.institution?.institution_id,
              metadata?.institution_name || metadata?.institution?.name,
            );
            if (!match) return;
            blockedSameBankMessage = alreadyLinkedBankMessage(
              metadata?.institution_name
              || metadata?.institution?.name
              || match.institution_name,
            );
            setStatus(blockedSameBankMessage);
            handler.exit({ force: true });
          },

          onSuccess: async (publicToken, metadata) => {

            try {

              if (existingAtLinkStart.length > 0) {
                const duplicateMsg = findDuplicatePlaidLink(
                  existingAtLinkStart,
                  metadata as PlaidLinkOnSuccessMetadata,
                );
                if (duplicateMsg) {
                  setStatus(duplicateMsg);
                  return;
                }
              }

              setStatus(mode === 'monthly' ? 'Connecting monthly sync…' : 'Connecting bank…');

              await plaidJson('/api/plaid/exchange', businessId, {

                method: 'POST',

                body: JSON.stringify({

                  business_id: businessId,

                  public_token: publicToken,

                  mode,

                }),

              });

              const linked = await fetchStatementsAfterLink(Plaid, mode, {
                additionalLink: hadExisting,
              });

              setStatus(linked.message);

              onLinked?.({ mode: linked.mode, bankMetricsUpdated: linked.bankMetricsUpdated });

            } catch (err) {

              setStatus(err instanceof Error ? err.message : 'Could not save the bank link.');

            } finally {

              setBusy(false);
              setLinkingMode(null);

              handler.destroy();

            }

          },

          onExit: (err) => {

            setBusy(false);
            setLinkingMode(null);

            handler.destroy();

            if (blockedSameBankMessage) {
              setStatus(blockedSameBankMessage);
              return;
            }

            if (err) setStatus('Bank link closed before finishing.');

          },

        });

        handler.open();

      } catch (err) {

        setBusy(false);
        setLinkingMode(null);

        const fallback =
          err instanceof Error && /\(500\)/.test(err.message)
            ? 'Bank link service error — make sure Plaid-Service is running on port 3000.'
            : 'Could not open bank link. Is the bank link service running?';
        setStatus(err instanceof Error ? err.message : fallback);

      }

    },

    [businessId, fetchStatementsAfterLink, onLinked],

  );



  return {

    linkBank,

    /** Open Plaid Link to add another bank (same account still blocked server-side). */
    linkNewBank: (mode: PlaidLinkMode = 'realtime') => linkBank(mode, { intent: 'link' }),

    busy,

    linkingMode,

    status,

    ready: Boolean(businessId),

    businessId,

  };

}

