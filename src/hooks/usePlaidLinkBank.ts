import { useCallback, useState } from 'react';

import {
  businessIdFromUser,
  clearStatementConsentSkipped,
  createStatementsUpdateLinkToken,
  markStatementConsentSkipped,
  plaidJson,
  pullBankStatements,
  statementConsentSkipped,
  statementItemIdsNeedingConsent,
  statementPullNeedsConsent,
} from '../lib/plaidClient';
import { parseAndIngestAllPlaidData } from '../lib/plaidIngest';
import {
  loadStatementRangePreference,
  resolveStatementRange,
  statementRangeToRequest,
} from '../lib/statementRange';

type PlaidHandler = {
  open: () => void;
  destroy: () => void;
};

type PlaidCreate = {
  create: (opts: {
    token: string;
    onSuccess: (publicToken: string, metadata?: unknown) => void | Promise<void>;
    onExit?: (err: unknown) => void;
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

/** Only call right after Link Bank — opens Plaid consent at most once per link session. */
export async function ensureBankStatementPdfs(
  Plaid: PlaidCreate,
  businessId: string,
): Promise<{
  statements: Awaited<ReturnType<typeof pullBankStatements>>['statements'];
  range: ReturnType<typeof statementRangeToRequest>;
}> {
  const saved = loadStatementRangePreference(businessId);
  const range = statementRangeToRequest(
    resolveStatementRange(saved.preset, saved.preset === 'custom' ? saved.custom : undefined),
  );
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

type LinkMode = 'realtime' | 'monthly';

type Options = {
  onLinked?: (mode: LinkMode) => void;
};

export function usePlaidLinkBank(userId: string | null | undefined, options?: Options) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const businessId = userId?.trim() ? businessIdFromUser(userId) : null;
  const onLinked = options?.onLinked;

  const fetchStatementsAfterLink = useCallback(
    async (Plaid: PlaidCreate, mode: LinkMode): Promise<string> => {
      clearStatementConsentSkipped(businessId!);
      await plaidJson(`/api/plaid/sync/${businessId!}`, businessId!, { method: 'POST' });
      const { statements, range } = await ensureBankStatementPdfs(Plaid, businessId!);
      setStatus('Parsing linked bank data…');
      const { ingest, statements: parsedStmts, transactions: parsedTxs } =
        await parseAndIngestAllPlaidData(businessId!, range);
      const saved = ingest?.success_count ?? 0;
      if (saved > 0) {
        const parts: string[] = [];
        const stmtMonths = parsedStmts.filter((s) => s.ok && (s.rows?.length ?? 0) > 0).length;
        const txMonths = parsedTxs.filter((s) => s.ok && (s.rows?.length ?? 0) > 0).length;
        if (stmtMonths > 0) parts.push(`${stmtMonths} statement month(s)`);
        if (txMonths > 0) parts.push(`${txMonths} transaction month(s)`);
        const detail = parts.length ? ` (${parts.join(', ')})` : '';
        return `Bank linked — ${saved} month(s) imported for analysis${detail}.`;
      }
      if (statements.length > 0) {
        return mode === 'monthly'
          ? 'Bank linked for monthly sync — statements fetched; import when ready.'
          : 'Bank linked — statements fetched; could not import yet.';
      }
      return mode === 'monthly'
        ? 'Bank linked for monthly statement sync.'
        : 'Bank linked.';
    },
    [businessId],
  );

  const linkBank = useCallback(
    async (mode: LinkMode = 'realtime') => {
      if (!businessId) {
        setStatus('Sign in to link a bank.');
        return;
      }
      setBusy(true);
      setStatus(null);
      try {
        const Plaid = await loadPlaidScript();
        const { link_token } = await plaidJson<{ link_token: string }>(
          '/api/plaid/link-token',
          businessId,
          {
            method: 'POST',
            body: JSON.stringify({ business_id: businessId, mode }),
          },
        );
        const handler = Plaid.create({
          token: link_token,
          onSuccess: async (publicToken) => {
            try {
              setStatus(mode === 'monthly' ? 'Connecting monthly sync…' : 'Connecting bank…');
              await plaidJson('/api/plaid/exchange', businessId, {
                method: 'POST',
                body: JSON.stringify({
                  business_id: businessId,
                  public_token: publicToken,
                  mode,
                }),
              });
              const linkStatus = await fetchStatementsAfterLink(Plaid, mode);
              setStatus(linkStatus);
              onLinked?.(mode);
            } catch (err) {
              setStatus(err instanceof Error ? err.message : 'Could not save the bank link.');
            } finally {
              setBusy(false);
              handler.destroy();
            }
          },
          onExit: (err) => {
            setBusy(false);
            handler.destroy();
            if (err) setStatus('Bank link closed before finishing.');
          },
        });
        handler.open();
      } catch (err) {
        setBusy(false);
        setStatus(
          err instanceof Error
            ? err.message
            : 'Could not open bank link. Is the bank link service running?',
        );
      }
    },
    [businessId, fetchStatementsAfterLink, onLinked],
  );

  return {
    linkBank,
    busy,
    status,
    ready: Boolean(businessId),
    businessId,
  };
}
