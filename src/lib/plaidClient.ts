import type { StatementRangeRequest } from './statementRange';

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
  institution_name: string | null;
  item_id: string | null;
  status: string | null;
};

export type BankStatementMeta = {
  statement_id: string;
  year: number;
  month: number;
  account_name: string | null;
  account_mask: string | null;
  institution_name: string | null;
  account_id: string | null;
  item_id: string | null;
  created_at: string | null;
};

export type BankTransaction = {
  transaction_id: string;
  account_id: string | null;
  amount: number | string;
  iso_currency_code: string | null;
  date: string;
  authorized_date: string | null;
  name: string | null;
  merchant_name: string | null;
  category: string[] | null;
  pending: boolean | null;
  updated_at: string | null;
};

export type TransactionSyncResult = {
  item_id?: string;
  added?: number;
  modified?: number;
  removed?: number;
  error?: string;
};

export type StatementPullResult = {
  item_id?: string;
  saved?: number;
  supported?: boolean;
  error_code?: string;
  error?: string;
};

function plaidHeaders(businessId: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-asktill-user-id': businessId,
  };
}

export async function plaidJson<T>(
  path: string,
  businessId: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { ...plaidHeaders(businessId), ...(init?.headers ?? {}) },
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Bank link request failed (${res.status})`);
  }
  return data;
}

/** True when Plaid needs a short consent step to turn on PDF statements for a linked bank. */
export function statementPullNeedsConsent(results: unknown[]): boolean {
  return (results as StatementPullResult[]).some(
    (r) => r?.supported === false && r.error_code === 'ADDITIONAL_CONSENT_REQUIRED',
  );
}

export function statementItemIdsNeedingConsent(results: unknown[]): string[] {
  return (results as StatementPullResult[])
    .filter((r) => r?.supported === false && r.error_code === 'ADDITIONAL_CONSENT_REQUIRED' && r.item_id)
    .map((r) => r.item_id!);
}

const CONSENT_SKIP_KEY = 'asktill:stmt-consent-skipped';

export function markStatementConsentSkipped(businessId: string): void {
  try {
    sessionStorage.setItem(`${CONSENT_SKIP_KEY}:${businessId}`, '1');
  } catch {
    /* ignore */
  }
}

export function statementConsentSkipped(businessId: string): boolean {
  try {
    return sessionStorage.getItem(`${CONSENT_SKIP_KEY}:${businessId}`) === '1';
  } catch {
    return false;
  }
}

export function clearStatementConsentSkipped(businessId: string): void {
  try {
    sessionStorage.removeItem(`${CONSENT_SKIP_KEY}:${businessId}`);
  } catch {
    /* ignore */
  }
}

export async function fetchLinkedBankAccounts(
  businessId: string,
): Promise<LinkedBankAccount[]> {
  const data = await plaidJson<{ accounts: LinkedBankAccount[] }>(
    `/api/plaid/accounts/${businessId}`,
    businessId,
  );
  return Array.isArray(data.accounts) ? data.accounts : [];
}

export async function refreshLinkedBankBalances(businessId: string): Promise<number> {
  const data = await plaidJson<{ refreshed: number }>(
    `/api/plaid/refresh-balances/${businessId}`,
    businessId,
    { method: 'POST' },
  );
  return data.refreshed ?? 0;
}

export async function removeAllLinkedBanks(businessId: string): Promise<number> {
  const data = await plaidJson<{ removed: number }>(
    `/api/plaid/items/${businessId}/remove-all`,
    businessId,
    { method: 'POST' },
  );
  return data.removed ?? 0;
}


function statementRangeQuery(range?: StatementRangeRequest): string {
  if (!range?.start_date || !range?.end_date) return '';
  const params = new URLSearchParams({
    start_date: range.start_date,
    end_date: range.end_date,
  });
  if (range.preset) params.set('preset', range.preset);
  return `?${params.toString()}`;
}

export async function fetchBankStatements(
  businessId: string,
  range?: StatementRangeRequest,
): Promise<BankStatementMeta[]> {
  const data = await plaidJson<{ statements: BankStatementMeta[] }>(
    `/api/plaid/statements/${businessId}${statementRangeQuery(range)}`,
    businessId,
  );
  return Array.isArray(data.statements) ? data.statements : [];
}

export async function pullBankStatements(
  businessId: string,
  range?: StatementRangeRequest,
): Promise<{ statements: BankStatementMeta[]; results: unknown[] }> {
  const data = await plaidJson<{ statements: BankStatementMeta[]; results: unknown[] }>(
    `/api/plaid/statements/${businessId}/pull`,
    businessId,
    {
      method: 'POST',
      body: JSON.stringify(range ?? {}),
    },
  );
  return {
    statements: Array.isArray(data.statements) ? data.statements : [],
    results: Array.isArray(data.results) ? data.results : [],
  };
}

export async function createStatementsUpdateLinkToken(
  businessId: string,
  itemId?: string,
): Promise<{ link_token: string; institution_name?: string | null; item_id?: string }> {
  return plaidJson<{ link_token: string; institution_name?: string | null; item_id?: string }>(
    '/api/plaid/link-token/statements',
    businessId,
    {
      method: 'POST',
      body: JSON.stringify({ business_id: businessId, item_id: itemId }),
    },
  );
}

export async function downloadBankStatementPdf(
  businessId: string,
  statementId: string,
): Promise<{ blob: Blob; filename: string }> {
  const res = await fetch(`/api/plaid/statements/${businessId}/download/${statementId}`, {
    headers: plaidHeaders(businessId),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || `Could not download statement (${res.status})`);
  }
  const disposition = res.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="([^"]+)"/i);
  const filename = match?.[1] || `bank-statement-${statementId}.pdf`;
  const blob = await res.blob();
  return { blob, filename };
}

export async function syncBankTransactions(
  businessId: string,
): Promise<{ results: TransactionSyncResult[] }> {
  const data = await plaidJson<{ results: TransactionSyncResult[] }>(
    `/api/plaid/sync/${businessId}`,
    businessId,
    { method: 'POST' },
  );
  return { results: Array.isArray(data.results) ? data.results : [] };
}

export type ParsedPlaidStatement = {
  ok: boolean;
  statement_id?: string;
  filename?: string;
  year?: number;
  month?: number;
  institution_name?: string | null;
  period?: {
    key?: string | null;
    label?: string | null;
    period_covered?: string | null;
    statement_date?: string | null;
  };
  opening_balance?: number | null;
  closing_balance?: number | null;
  total_debits?: number;
  total_credits?: number;
  rows?: Array<{
    date: string | null;
    description: string;
    debit: number;
    credit: number;
    balance: number | null;
  }>;
  error?: string;
};

export type PlaidIngestResponse = {
  ingested: Array<{
    ok: boolean;
    statement_id?: string;
    period_key?: string;
    period_label?: string;
    saved_statement_id?: string;
    row_count?: number;
    error?: string;
  }>;
  success_count: number;
  failure_count: number;
};

export async function parseAllPlaidBankStatements(
  businessId: string,
  range?: StatementRangeRequest,
): Promise<{ statements: ParsedPlaidStatement[]; count: number }> {
  const data = await plaidJson<{ statements: ParsedPlaidStatement[]; count: number }>(
    `/api/plaid/statements/${businessId}/parse-all`,
    businessId,
    {
      method: 'POST',
      body: JSON.stringify(range ?? {}),
    },
  );
  return {
    statements: Array.isArray(data.statements) ? data.statements : [],
    count: data.count ?? 0,
  };
}

export type ParsedPlaidTransactionsResult = {
  ok: boolean;
  ledgers: ParsedPlaidStatement[];
  month_count: number;
  transaction_count: number;
  raw_count?: number;
  error?: string;
};

/** Sync + parse stored Plaid transactions via Plaid-Statement-Parser (one ledger per month). */
export async function parseAllPlaidTransactions(
  businessId: string,
  range?: StatementRangeRequest,
  options?: { sync?: boolean },
): Promise<ParsedPlaidTransactionsResult> {
  const sync = options?.sync !== false;
  const qs = sync ? '' : '?sync=false';
  const data = await plaidJson<ParsedPlaidTransactionsResult>(
    `/api/plaid/transactions/${businessId}/parse-all${qs}`,
    businessId,
    {
      method: 'POST',
      body: JSON.stringify(range ?? {}),
    },
  );
  return {
    ok: Boolean(data.ok),
    ledgers: Array.isArray(data.ledgers) ? data.ledgers : [],
    month_count: data.month_count ?? 0,
    transaction_count: data.transaction_count ?? 0,
    raw_count: data.raw_count,
    error: data.error,
  };
}

export type ParsedPlaidDataResult = {
  ledgers: ParsedPlaidStatement[];
  statements: ParsedPlaidStatement[];
  transactions: ParsedPlaidStatement[];
  statement_count: number;
  transaction_month_count: number;
  errors?: string[];
};

/** Sync + parse statement PDFs and transactions (single parser repo; PDF wins on duplicate months). */
export async function parseAllPlaidData(
  businessId: string,
  range?: StatementRangeRequest,
  options?: { sync?: boolean },
): Promise<ParsedPlaidDataResult> {
  const sync = options?.sync !== false;
  const qs = sync ? '' : '?sync=false';
  const data = await plaidJson<ParsedPlaidDataResult>(
    `/api/plaid/parse-all/${businessId}${qs}`,
    businessId,
    {
      method: 'POST',
      body: JSON.stringify(range ?? {}),
    },
  );
  return {
    ledgers: Array.isArray(data.ledgers) ? data.ledgers : [],
    statements: Array.isArray(data.statements) ? data.statements : [],
    transactions: Array.isArray(data.transactions) ? data.transactions : [],
    statement_count: data.statement_count ?? 0,
    transaction_month_count: data.transaction_month_count ?? 0,
    errors: Array.isArray(data.errors) ? data.errors : undefined,
  };
}

export async function parsePlaidBankStatement(
  businessId: string,
  statementId: string,
): Promise<ParsedPlaidStatement> {
  return plaidJson<ParsedPlaidStatement>(
    `/api/plaid/statements/${businessId}/parse/${statementId}`,
    businessId,
  );
}

export async function fetchBankTransactions(
  businessId: string,
  range?: StatementRangeRequest,
  limit = 200,
): Promise<BankTransaction[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (range?.start_date) params.set('start_date', range.start_date);
  if (range?.end_date) params.set('end_date', range.end_date);
  if (range?.preset) params.set('preset', range.preset);
  const data = await plaidJson<{ transactions: BankTransaction[] }>(
    `/api/plaid/transactions/${businessId}?${params.toString()}`,
    businessId,
  );
  return Array.isArray(data.transactions) ? data.transactions : [];
}
