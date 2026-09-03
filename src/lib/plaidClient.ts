const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Plaid-Service stores business_id as UUID; keep a stable id for non-UUID auth subs. */
export function businessIdFromUser(userId: string): string {
  const id = userId.trim();
  if (UUID_RE.test(id)) return id;
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) {
    const c = id.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (c + i), 0x01000193) >>> 0;
  }
  const hex = (
    h1.toString(16).padStart(8, '0') +
    h2.toString(16).padStart(8, '0') +
    '0'.repeat(16)
  ).slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export type LinkedBankAccount = {
  account_id: string;
  name: string | null;
  official_name: string | null;
  type: string | null;
  subtype: string | null;
  mask: string | null;
  current_balance: number | string | null;
  available_balance: number | string | null;
  iso_currency_code: string | null;
  updated_at: string | null;
  institution_id: string | null;
  institution_name: string | null;
  item_id: string | null;
  status: string | null;
};

function institutionNameKey(name?: string | null): string {
  return (name || '').trim().toLowerCase();
}

function accountTypeKey(type?: string | null, subtype?: string | null): string {
  return (subtype || type || '').trim().toLowerCase();
}

/** Plaid Link events put institution_id on the metadata root, not only nested. */
export function institutionFromPlaidMeta(metadata?: {
  institution_id?: string | null;
  institution_name?: string | null;
  institution?: { institution_id?: string | null; name?: string | null } | null;
} | null): { institutionId: string; institutionName: string } {
  return {
    institutionId: (
      metadata?.institution_id
      || metadata?.institution?.institution_id
      || ''
    ).trim(),
    institutionName: (
      metadata?.institution_name
      || metadata?.institution?.name
      || ''
    ).trim(),
  };
}

export function findSameLinkedBank(
  accounts: LinkedBankAccount[],
  institutionId?: string | null,
  institutionName?: string | null,
): LinkedBankAccount | undefined {
  const id = (institutionId || '').trim();
  const name = institutionNameKey(institutionName);
  if (!id && !name) return undefined;
  return accounts.find((account) => {
    if (id && account.institution_id && account.institution_id === id) return true;
    return Boolean(name && institutionNameKey(account.institution_name) === name);
  });
}

export function alreadyLinkedBankMessage(institutionName?: string | null): string {
  const label = (institutionName || '').trim() || 'This bank';
  return `${label} is already linked. Connect a different bank.`;
}

export type PlaidLinkAccountMeta = {
  id?: string;
  name?: string | null;
  mask?: string | null;
  type?: string | null;
  subtype?: string | null;
};

export type PlaidLinkOnSuccessMetadata = {
  institution_id?: string | null;
  institution_name?: string | null;
  institution?: {
    name?: string | null;
    institution_id?: string | null;
  } | null;
  accounts?: PlaidLinkAccountMeta[] | null;
};

function duplicateAccountLabel(row: LinkedBankAccount): string {
  const bank = (row.institution_name || '').trim() || 'This account';
  const mask = (row.mask || '').trim();
  return mask ? `${bank} ···${mask}` : bank;
}

/** Same institution or same account already linked — do not exchange the public token. */
export function findDuplicatePlaidLink(
  existing: LinkedBankAccount[],
  metadata: PlaidLinkOnSuccessMetadata | null | undefined,
): string | null {
  if (!existing.length) return null;

  const { institutionId, institutionName } = institutionFromPlaidMeta(metadata);
  const sameBank = findSameLinkedBank(existing, institutionId, institutionName);
  if (sameBank) {
    return alreadyLinkedBankMessage(sameBank.institution_name || institutionName);
  }

  if (!metadata?.accounts?.length) return null;

  const incomingInstName = institutionNameKey(institutionName);
  for (const acct of metadata.accounts) {
    const incomingId = acct.id?.trim();
    if (!incomingId) continue;
    const incomingMask = (acct.mask || '').trim();
    const incomingType = accountTypeKey(acct.type, acct.subtype);

    for (const row of existing) {
      if (row.account_id === incomingId) {
        return `${duplicateAccountLabel(row)} is already linked. Choose a different account in Plaid.`;
      }
      const rowMask = (row.mask || '').trim();
      const rowType = accountTypeKey(row.type, row.subtype);
      const institutionMatch = Boolean(
        incomingInstName && institutionNameKey(row.institution_name) === incomingInstName,
      );
      if (
        institutionMatch
        && incomingMask
        && rowMask
        && incomingMask === rowMask
        && incomingType
        && rowType
        && incomingType === rowType
      ) {
        return `${duplicateAccountLabel(row)} is already linked. Choose a different account in Plaid.`;
      }
    }
  }

  return null;
}

export type PlaidLinkMode = 'realtime' | 'monthly';

export type ParsedPlaidLedgerRow = {
  date?: string;
  description?: string;
  debit?: number;
  credit?: number;
  balance?: number | null;
};

export type ParsedPlaidStatement = {
  ok?: boolean;
  filename?: string;
  statement_id?: string;
  opening_balance?: number | null;
  closing_balance?: number | null;
  total_credits?: number | null;
  total_debits?: number | null;
  period?: {
    key?: string;
    label?: string;
    period_covered?: string;
    statement_date?: string;
  };
  rows?: ParsedPlaidLedgerRow[];
  error?: string;
};

export type PlaidRawTransaction = {
  transaction_id?: string;
  amount?: number | string;
  date?: string;
  name?: string | null;
  merchant_name?: string | null;
  pending?: boolean;
};

const PLAID_JSON_TIMEOUT_MS = 45_000;
const PLAID_WARM_TTL_MS = 60_000;
let plaidWarmUntil = 0;

export type PlaidPullStage =
  | 'wake'
  | 'accounts'
  | 'transactions'
  | 'sync'
  | 'statements'
  | 'parse';

export const PLAID_PULL_STAGE_LABEL: Record<PlaidPullStage, string> = {
  wake: 'Waking bank service…',
  accounts: 'Checking linked banks…',
  transactions: 'Loading transactions…',
  sync: 'Syncing transactions from your bank…',
  statements: 'Loading statements…',
  parse: 'Parsing statements…',
};

export type PlaidPullProgress = (stage: PlaidPullStage) => void;

function sleep(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function isRetryablePlaidFailure(status: number, text: string) {
  if (status === 502 || status === 503 || status === 504) return true;
  return /application loading|service waking|cold start/i.test(text);
}

export async function warmupPlaidService(): Promise<void> {
  try {
    await ensurePlaidReady();
  } catch {
    /* Page load should not block; the next pull waits until ready. */
  }
}

/** Wait until asktill-plaid on Render answers /health. Cold start is the Vercel delay. */
export async function ensurePlaidReady(onProgress?: PlaidPullProgress): Promise<void> {
  if (Date.now() < plaidWarmUntil) return;
  onProgress?.('wake');
  const deadline = Date.now() + 60_000;
  let lastError = 'Bank service did not become ready.';
  while (Date.now() < deadline) {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 8_000);
    try {
      const res = await fetch('/api/plaid-health', { method: 'GET', signal: ctrl.signal });
      const data = await res.json().catch(() => ({} as { status?: string }));
      if (res.ok && (data.status === 'ok' || data.service === 'plaid-service')) {
        plaidWarmUntil = Date.now() + PLAID_WARM_TTL_MS;
        void fetch('/api/plaid-parser-health').catch(() => undefined);
        return;
      }
      lastError = `Bank service not ready (${res.status}).`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : lastError;
    } finally {
      window.clearTimeout(timer);
    }
    await sleep(2_000);
  }
  throw new Error(`${lastError} Try again in a minute.`);
}

async function plaidJsonOnce<T>(
  path: string,
  businessId: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('x-asktill-user-id', businessId);
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
  const parentSignal = init.signal;
  const onParentAbort = () => ctrl.abort();
  parentSignal?.addEventListener('abort', onParentAbort);
  try {
    const res = await fetch(`/api/plaid${path}`, { ...init, headers, signal: ctrl.signal });
    const text = await res.text();
    let data: T | { error?: string } = {} as T;
    try {
      data = text ? (JSON.parse(text) as T) : ({} as T);
    } catch {
      data = { error: text || res.statusText } as { error?: string };
    }
    if (!res.ok) {
      const err = data as { error?: string; error_code?: string };
      const error = new Error(err.error || `Plaid request failed (${res.status})`) as Error & {
        status?: number;
        error_code?: string;
        retryable?: boolean;
      };
      error.status = res.status;
      error.error_code = err.error_code;
      error.retryable = isRetryablePlaidFailure(res.status, text);
      throw error;
    }
    plaidWarmUntil = Date.now() + PLAID_WARM_TTL_MS;
    return data as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Bank sync timed out. The bank service may be waking up — try again.');
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
    parentSignal?.removeEventListener('abort', onParentAbort);
  }
}

async function plaidJson<T>(
  path: string,
  businessId: string,
  init: RequestInit = {},
  timeoutMs = PLAID_JSON_TIMEOUT_MS,
): Promise<T> {
  try {
    return await plaidJsonOnce<T>(path, businessId, init, timeoutMs);
  } catch (err) {
    const retryable =
      Boolean((err as { retryable?: boolean }).retryable)
      || err instanceof TypeError
      || (err instanceof Error && /failed to fetch|network/i.test(err.message));
    if (!retryable) throw err;
    await warmupPlaidService();
    await sleep(1_500);
    return plaidJsonOnce<T>(path, businessId, init, timeoutMs);
  }
}

export async function createLinkToken(businessId: string, mode: PlaidLinkMode) {
  return plaidJson<{ link_token: string; expiration?: string; mode?: string }>(
    '/link-token',
    businessId,
    { method: 'POST', body: JSON.stringify({ business_id: businessId, mode }) },
  );
}

export async function exchangePublicToken(
  businessId: string,
  publicToken: string,
  institution?: { institution_id?: string | null; name?: string | null } | null,
) {
  return plaidJson<{
    item_id: string;
    institution_name: string | null;
    accounts: number;
  }>('/exchange', businessId, {
    method: 'POST',
    body: JSON.stringify({
      business_id: businessId,
      public_token: publicToken,
      institution,
    }),
  });
}

export async function fetchLinkedBankAccounts(businessId: string) {
  const data = await plaidJson<{ accounts?: LinkedBankAccount[] }>(
    `/accounts/${encodeURIComponent(businessId)}`,
    businessId,
    {},
    45_000,
  );
  return data.accounts || [];
}

export async function fetchPlaidTransactions(businessId: string, preset = '1m') {
  const id = encodeURIComponent(businessId);
  const data = await plaidJson<{ transactions?: PlaidRawTransaction[] }>(
    `/transactions/${id}?preset=${encodeURIComponent(preset)}&limit=500`,
    businessId,
    {},
    45_000,
  );
  return data.transactions || [];
}

export async function syncPlaidTransactions(businessId: string) {
  const data = await plaidJson<{
    results?: Array<{
      added?: number;
      modified?: number;
      error?: string;
      error_code?: string;
    }>;
  }>(
    `/sync/${encodeURIComponent(businessId)}`,
    businessId,
    {
      method: 'POST',
      body: JSON.stringify({ business_id: businessId }),
    },
    90_000,
  );
  const results = data.results || [];
  const failed = results.filter((row) => row.error || row.error_code);
  if (results.length && failed.length === results.length) {
    const first = failed[0];
    const error = new Error(
      first?.error || 'Could not sync transactions from your bank.',
    ) as Error & { error_code?: string };
    error.error_code = first?.error_code;
    throw error;
  }
  return data;
}

export type PlaidStoredStatement = {
  statement_id?: string;
  year?: number;
  month?: number;
};

export async function pullPlaidStatements(businessId: string) {
  const id = encodeURIComponent(businessId);
  return plaidJson<{
    results?: Array<{
      saved?: number;
      supported?: boolean;
      error?: string;
      error_code?: string;
    }>;
    statements?: PlaidStoredStatement[];
  }>(
    `/statements/${id}/pull?preset=6m`,
    businessId,
    {
      method: 'POST',
      body: JSON.stringify({ business_id: businessId, preset: '6m' }),
    },
    60_000,
  );
}

export async function parsePlaidStatements(
  businessId: string,
  range: { preset?: string; start_date?: string; end_date?: string },
) {
  const id = encodeURIComponent(businessId);
  const params = new URLSearchParams();
  if (range.preset) params.set('preset', range.preset);
  if (range.start_date) params.set('start_date', range.start_date);
  if (range.end_date) params.set('end_date', range.end_date);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return plaidJson<{
    ledgers?: ParsedPlaidStatement[];
    statements?: ParsedPlaidStatement[];
    error?: string;
  }>(
    `/statements/${id}/parse-all${qs}`,
    businessId,
    {
      method: 'POST',
      body: JSON.stringify({ business_id: businessId, ...range }),
    },
    90_000,
  );
}

export async function parseAllPlaidData(businessId: string, preset?: string) {
  const qs = preset ? `?preset=${encodeURIComponent(preset)}` : '';
  const id = encodeURIComponent(businessId);
  // Realtime: transactions only. parse-all also downloads statement PDFs and is too slow on Render.
  const path = preset === 'prev_month'
    ? `/statements/${id}/parse-all${qs}`
    : `/transactions/${id}/parse-all${qs}`;
  return plaidJson<{
    ledgers?: ParsedPlaidStatement[];
    statements?: ParsedPlaidStatement[];
    error?: string;
  }>(
    path,
    businessId,
    {
      method: 'POST',
      body: JSON.stringify({
        business_id: businessId,
        ...(preset ? { preset } : {}),
        sync: preset !== 'prev_month',
      }),
    },
  );
}

export async function removeAllLinkedBanks(businessId: string) {
  return plaidJson(`/items/${encodeURIComponent(businessId)}/remove-all`, businessId, {
    method: 'POST',
    body: JSON.stringify({ business_id: businessId }),
  });
}

export async function refreshLinkedBankBalances(businessId: string) {
  return plaidJson(`/refresh-balances/${encodeURIComponent(businessId)}`, businessId, {
    method: 'POST',
    body: JSON.stringify({ business_id: businessId }),
  });
}
