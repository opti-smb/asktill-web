import { comparePeriodKeys, isPlaidOverlayReport, pickMostRecentlyUploadedReport, pickUploadBaselineReport } from './atLetterStatement';
import type { AnalyzeResult } from './analyzeResponse';
import { getAnalyzeAnalysis } from './analyzeResponse';
import { getActiveStatementViewId } from './activeStatementView';
import { extractBriefMetrics } from './briefMetrics';
import {
  fetchReportHistory,
  fetchSavedReport,
  invalidateReportHistoryCache,
} from './api';
import { parseAndIngestPlaidStatements } from './plaidIngest';
import {
  fetchLinkedBankAccounts,
  fetchPlaidTransactions,
  parsePlaidStatements,
  pullPlaidStatements,
  syncPlaidTransactions,
  type LinkedBankAccount,
  type ParsedPlaidStatement,
  type PlaidLinkMode,
  type PlaidRawTransaction,
} from './plaidClient';

export type { PlaidLinkMode };

export type PlaidSpendSlice = {
  id: string;
  label: string;
  value: number;
};

export type PlaidIncomeSlice = {
  id: string;
  label: string;
  value: number;
};

export type PlaidPullCompare = {
  rangeStart: string;
  rangeEnd: string;
  moneyIn: number;
  moneyOut: number;
  cashAvailable: number;
};

export type PlaidBankMetrics = {
  moneyIn: number;
  moneyOut: number;
  cashAvailable: number;
  openingBalance: number | null;
  periodLabel: string;
  rangeStart: string;
  rangeEnd: string;
  spendSlices: PlaidSpendSlice[];
  incomeSlices: PlaidIncomeSlice[];
  linkMode: PlaidLinkMode;
  updatedAt: string;
  comparedTo?: PlaidPullCompare | null;
};

type StatementRangeRequest = {
  start_date: string;
  end_date: string;
};

const STORAGE_PREFIX = 'asktill:plaid-bank-metrics:';
const LAST_PULL_PREFIX = 'asktill:plaid-last-pull:';

export const PLAID_BANK_METRICS_EVENT = 'asktill:plaid-bank-metrics';
export const UPLOAD_BASELINE_RESTORE_EVENT = 'asktill:upload-baseline-restore';

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId.trim()}`;
}

function isoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Calendar month start through today — live bank overlay window. */
export function monthToDateRange(): StatementRangeRequest {
  const now = new Date();
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  return { start_date: start, end_date: isoDateLocal(now) };
}

export function previousCalendarMonthRequest(): StatementRangeRequest {
  const now = new Date();
  const lastPrev = new Date(now.getFullYear(), now.getMonth(), 0);
  const start = new Date(lastPrev.getFullYear(), lastPrev.getMonth(), 1);
  return {
    start_date: isoDateLocal(start),
    end_date: isoDateLocal(lastPrev),
  };
}

function ledgerPeriodKey(ledger: ParsedPlaidStatement): string | null {
  return ledger.period?.key?.trim() || null;
}

function sumRowsCredits(rows: ParsedPlaidStatement['rows']): number {
  return (rows ?? []).reduce((sum, row) => sum + (row.credit || 0), 0);
}

function sumRowsDebits(rows: ParsedPlaidStatement['rows']): number {
  return (rows ?? []).reduce((sum, row) => sum + (row.debit || 0), 0);
}

function formatUsMonthDay(isoDate: string): string | null {
  const [y, m, d] = isoDate.split('-').map((part) => Number(part));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
  });
}

export function formatPullDateRange(rangeStart: string, rangeEnd: string): string | null {
  const startText = formatUsMonthDay(rangeStart.trim());
  const endText = formatUsMonthDay(rangeEnd.trim());
  if (!startText || !endText) return null;
  if (rangeStart.trim() === rangeEnd.trim()) return startText;
  return `${startText} to ${endText}`;
}

export function formatBankLinkedFootnote(
  metrics: Pick<
    PlaidBankMetrics,
    'linkMode' | 'rangeStart' | 'rangeEnd' | 'periodLabel' | 'comparedTo'
  >,
): string {
  if (metrics.linkMode === 'monthly') {
    const label = metrics.periodLabel?.trim().replace(/^Bank · /, '');
    if (label) return `Linked bank · ${label}`;
    return 'Linked bank · previous month statement';
  }
  const rangeStart = metrics.rangeStart;
  const rangeEnd = metrics.rangeEnd;
  const current = formatPullDateRange(rangeStart, rangeEnd);
  const previous = metrics.comparedTo
    ? formatPullDateRange(metrics.comparedTo.rangeStart, metrics.comparedTo.rangeEnd)
    : null;
  if (current && previous) return `Linked bank · ${current} · vs ${previous}`;
  if (current) return `Linked bank · ${current}`;
  return 'Linked bank · month to date';
}

function pullWindowLabel(rangeStart: string, rangeEnd: string): string {
  return formatPullDateRange(rangeStart, rangeEnd) || mtdPeriodLabel(rangeEnd);
}

function mtdPeriodLabel(endDate: string): string {
  const [year, month, day] = endDate.split('-').map((part) => Number(part));
  if (!year || !month || !day) return 'Bank · month to date';
  const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' });
  return `${monthName} ${year} (through ${month}/${day}/${year})`;
}

function statementMonthLabel(rangeStart: string): string {
  const [y, m] = rangeStart.slice(0, 7).split('-').map(Number);
  if (!y || !m) return 'Previous month';
  return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function isTransactionMtdLedger(ledger: ParsedPlaidStatement): boolean {
  const filename = ledger.filename ?? '';
  if (filename.includes('plaid_transactions') || filename.includes('plaid_tx_')) {
    return true;
  }
  return (ledger.period?.label ?? '').includes('through');
}

function clipLedgerToRange(
  ledger: ParsedPlaidStatement,
  range: StatementRangeRequest,
): ParsedPlaidStatement {
  const startDate = range.start_date?.trim();
  const endDate = range.end_date?.trim();
  if (!startDate || !endDate) return ledger;
  const rows = (ledger.rows ?? []).filter((row) => {
    const day = row.date?.slice(0, 10);
    return day && day >= startDate && day <= endDate;
  });
  const periodKey = endDate.slice(0, 7);
  return {
    ...ledger,
    rows,
    total_credits: Math.round(sumRowsCredits(rows) * 100) / 100,
    total_debits: Math.round(sumRowsDebits(rows) * 100) / 100,
    period: {
      ...ledger.period,
      key: periodKey,
      label: pullWindowLabel(startDate, endDate),
      period_covered: `${startDate} → ${endDate}`,
      statement_date: endDate,
    },
  };
}

function pickStatementLedger(
  ledgers: ParsedPlaidStatement[],
  range: StatementRangeRequest,
): ParsedPlaidStatement | null {
  const okLedgers = ledgers.filter(
    (ledger) =>
      ledger.ok !== false
      && !isTransactionMtdLedger(ledger)
      && ((ledger.rows?.length ?? 0) > 0
        || ledger.total_credits != null
        || ledger.total_debits != null),
  );
  if (!okLedgers.length) return null;
  const periodKey = range.start_date?.slice(0, 7);
  const matched = periodKey
    ? okLedgers.filter((ledger) => ledgerPeriodKey(ledger) === periodKey)
    : okLedgers;
  const pool = matched.length ? matched : okLedgers;
  return [...pool].sort((a, b) =>
    comparePeriodKeys(ledgerPeriodKey(a), ledgerPeriodKey(b)),
  )[0] ?? null;
}

function pickMtdLedger(ledgers: ParsedPlaidStatement[]): ParsedPlaidStatement | null {
  const okLedgers = ledgers.filter(
    (ledger) =>
      ledger.ok !== false
      && ((ledger.rows?.length ?? 0) > 0
        || ledger.total_credits != null
        || ledger.total_debits != null),
  );
  if (!okLedgers.length) return null;
  const txLedgers = okLedgers.filter(isTransactionMtdLedger);
  const pool = txLedgers.length ? txLedgers : okLedgers;
  return [...pool].sort((a, b) =>
    comparePeriodKeys(ledgerPeriodKey(a), ledgerPeriodKey(b)),
  )[0] ?? null;
}

function buildIncomeSlicesFromLedger(ledger: ParsedPlaidStatement): PlaidIncomeSlice[] {
  const buckets = new Map<string, number>();
  for (const row of ledger.rows ?? []) {
    const credit = row.credit || 0;
    if (credit <= 0) continue;
    const label = row.description?.trim() || 'Bank deposit';
    buckets.set(label, (buckets.get(label) ?? 0) + credit);
  }
  return topSlices(buckets, 'bank-in');
}

function buildSpendSlicesFromLedger(ledger: ParsedPlaidStatement): PlaidSpendSlice[] {
  const buckets = new Map<string, number>();
  for (const row of ledger.rows ?? []) {
    const debit = row.debit || 0;
    if (debit <= 0) continue;
    const label = row.description?.trim() || 'Bank outflow';
    buckets.set(label, (buckets.get(label) ?? 0) + debit);
  }
  return topSlices(buckets, 'bank-out');
}

function topSlices(
  buckets: Map<string, number>,
  idPrefix: string,
): Array<{ id: string; label: string; value: number }> {
  const sorted = [...buckets.entries()]
    .map(([label, value], index) => ({
      id: `${idPrefix}-${index}`,
      label,
      value: Math.round(value * 100) / 100,
    }))
    .sort((a, b) => b.value - a.value);
  const maxSlices = 6;
  if (sorted.length <= maxSlices) return sorted;
  const top = sorted.slice(0, maxSlices - 1);
  const otherTotal = sorted.slice(maxSlices - 1).reduce((sum, slice) => sum + slice.value, 0);
  top.push({
    id: `${idPrefix}-other`,
    label: 'Other',
    value: Math.round(otherTotal * 100) / 100,
  });
  return top;
}

function sumAvailableBalance(accounts: LinkedBankAccount[]): number | null {
  let total = 0;
  let found = false;
  for (const account of accounts) {
    const raw = account.available_balance ?? account.current_balance;
    if (raw == null || raw === '') continue;
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(n)) continue;
    total += n;
    found = true;
  }
  return found ? total : null;
}

function isLiveOpeningBalance(ledger: ParsedPlaidStatement): boolean {
  const filename = ledger.filename ?? '';
  if (filename.includes('plaid_transactions') || filename.includes('plaid_tx_')) {
    return false;
  }
  return ledger.opening_balance != null && Number.isFinite(ledger.opening_balance);
}

/** Month-to-date Money In / Out / Available from parsed Plaid ledgers + live balances. */
export function buildPlaidBankMetrics(
  ledgers: ParsedPlaidStatement[],
  accounts: LinkedBankAccount[],
  range?: StatementRangeRequest,
  options?: {
    linkMode?: PlaidLinkMode;
    previous?: PlaidPullCompare | null;
    fallbackCash?: number | null;
  },
): PlaidBankMetrics | null {
  const linkMode = options?.linkMode ?? 'realtime';
  const picked =
    linkMode === 'monthly' && range
      ? pickStatementLedger(ledgers, range)
      : pickMtdLedger(ledgers);
  if (!picked) return null;

  const scoped =
    linkMode === 'monthly' || !range ? picked : clipLedgerToRange(picked, range);

  const moneyIn = Math.round(sumRowsCredits(scoped.rows) * 100) / 100;
  const moneyOut = Math.round(sumRowsDebits(scoped.rows) * 100) / 100;
  const fromAccounts = sumAvailableBalance(accounts);
  const fromStatementClosing =
    linkMode === 'monthly'
    && scoped.closing_balance != null
    && Number.isFinite(scoped.closing_balance)
      ? scoped.closing_balance
      : null;
  const cashAvailable =
    fromAccounts
    ?? fromStatementClosing
    ?? (options?.fallbackCash != null && Number.isFinite(options.fallbackCash)
      ? options.fallbackCash
      : null);
  const hasActivity = moneyIn > 0 || moneyOut > 0 || (scoped.rows?.length ?? 0) > 0;
  if (cashAvailable == null && !hasActivity) return null;

  const rangeStart = range?.start_date?.trim() ?? '';
  const rangeEnd = range?.end_date?.trim() ?? '';
  const periodLabel =
    linkMode === 'monthly'
      ? (scoped.period?.label?.trim() || (rangeStart ? statementMonthLabel(rangeStart) : 'Previous month'))
      : (rangeStart && rangeEnd ? pullWindowLabel(rangeStart, rangeEnd) : null)
        || scoped.period?.label?.trim()
        || (rangeEnd ? mtdPeriodLabel(rangeEnd) : null)
        || (ledgerPeriodKey(scoped)
          ? `Bank · ${ledgerPeriodKey(scoped)}`
          : 'Bank · month to date');

  let spendSlices = buildSpendSlicesFromLedger(scoped);
  if (!spendSlices.length && moneyOut > 0) {
    spendSlices = [{ id: 'bank-out', label: 'Bank outflows', value: moneyOut }];
  }
  let incomeSlices = buildIncomeSlicesFromLedger(scoped);
  if (!incomeSlices.length && moneyIn > 0) {
    incomeSlices = [{ id: 'bank-in', label: 'Bank deposits', value: moneyIn }];
  }

  const openingBalance =
    isLiveOpeningBalance(scoped) && scoped.opening_balance != null
      ? scoped.opening_balance
      : null;

  const previous = options?.previous ?? null;
  const comparedTo =
    previous
    && (previous.rangeStart !== rangeStart || previous.rangeEnd !== rangeEnd)
      ? previous
      : null;

  return {
    moneyIn,
    moneyOut,
    cashAvailable: cashAvailable ?? 0,
    openingBalance,
    periodLabel,
    rangeStart,
    rangeEnd,
    spendSlices,
    incomeSlices,
    linkMode,
    updatedAt: new Date().toISOString(),
    comparedTo,
  };
}

function okLedgersFromParse(parsed: {
  ledgers?: ParsedPlaidStatement[];
  statements?: ParsedPlaidStatement[];
}): ParsedPlaidStatement[] {
  const rows = [...(parsed.ledgers ?? []), ...(parsed.statements ?? [])];
  const seen = new Set<string>();
  const out: ParsedPlaidStatement[] = [];
  for (const ledger of rows) {
    if (ledger?.ok === false) continue;
    const key = `${ledger.filename ?? ''}|${ledger.period?.key ?? ''}|${ledger.rows?.length ?? 0}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ledger);
  }
  return out;
}

function lastPullKey(userId: string): string {
  return `${LAST_PULL_PREFIX}${userId.trim()}`;
}

function toPullCompare(metrics: PlaidBankMetrics): PlaidPullCompare {
  return {
    rangeStart: metrics.rangeStart,
    rangeEnd: metrics.rangeEnd,
    moneyIn: metrics.moneyIn,
    moneyOut: metrics.moneyOut,
    cashAvailable: metrics.cashAvailable,
  };
}

export function loadLastPlaidPull(userId: string | null | undefined): PlaidPullCompare | null {
  if (!userId?.trim()) return null;
  try {
    const raw = localStorage.getItem(lastPullKey(userId.trim()));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlaidPullCompare;
    if (
      parsed
      && parsed.rangeStart
      && parsed.rangeEnd
      && Number.isFinite(parsed.moneyIn)
      && Number.isFinite(parsed.moneyOut)
      && Number.isFinite(parsed.cashAvailable)
    ) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function saveLastPlaidPull(userId: string, snapshot: PlaidPullCompare): void {
  try {
    localStorage.setItem(lastPullKey(userId), JSON.stringify(snapshot));
  } catch {
    /* private mode */
  }
}

export function clearLastPlaidPull(userId: string | null | undefined): void {
  if (!userId?.trim()) return;
  try {
    localStorage.removeItem(lastPullKey(userId.trim()));
  } catch {
    /* ignore */
  }
}

function pullRangeForMode(linkMode: PlaidLinkMode): StatementRangeRequest {
  if (linkMode === 'monthly') return previousCalendarMonthRequest();
  return monthToDateRange();
}

function ledgerFromRawTransactions(
  transactions: PlaidRawTransaction[],
  range: StatementRangeRequest,
  kind: 'mtd' | 'statement' = 'mtd',
): ParsedPlaidStatement {
  const rows: NonNullable<ParsedPlaidStatement['rows']> = [];
  for (const tx of transactions) {
    if (tx.pending) continue;
    const day = String(tx.date || '').slice(0, 10);
    if (!day || day < range.start_date || day > range.end_date) continue;
    const amount = typeof tx.amount === 'number' ? tx.amount : Number(tx.amount);
    if (!Number.isFinite(amount) || amount === 0) continue;
    const description = (tx.merchant_name || tx.name || 'Bank').trim();
    if (amount < 0) {
      rows.push({
        date: day,
        description,
        credit: Math.round(Math.abs(amount) * 100) / 100,
        debit: 0,
      });
    } else {
      rows.push({
        date: day,
        description,
        credit: 0,
        debit: Math.round(amount * 100) / 100,
      });
    }
  }
  const periodKey = range.end_date.slice(0, 7);
  const monthly = kind === 'statement';
  return {
    ok: true,
    filename: monthly ? `plaid_stmt_${periodKey}.csv` : `plaid_tx_${periodKey}.csv`,
    rows,
    total_credits: Math.round(sumRowsCredits(rows) * 100) / 100,
    total_debits: Math.round(sumRowsDebits(rows) * 100) / 100,
    period: {
      key: periodKey,
      label: monthly ? statementMonthLabel(range.start_date) : mtdPeriodLabel(range.end_date),
      period_covered: `${range.start_date} → ${range.end_date}`,
      statement_date: range.end_date,
    },
  };
}

function rangeFromPeriodKey(periodKey: string | null): StatementRangeRequest | null {
  if (!periodKey || !/^\d{4}-\d{2}$/.test(periodKey)) return null;
  const [year, month] = periodKey.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start_date: `${periodKey}-01`,
    end_date: `${periodKey}-${String(lastDay).padStart(2, '0')}`,
  };
}

async function parseStatementLedgers(
  businessId: string,
  range: { preset?: string; start_date?: string; end_date?: string },
): Promise<ParsedPlaidStatement[]> {
  try {
    const parsed = await parsePlaidStatements(businessId, range);
    return okLedgersFromParse(parsed);
  } catch {
    return [];
  }
}

async function overlayFromMonthlyStatements(
  businessId: string,
  range: StatementRangeRequest,
  accounts: LinkedBankAccount[],
  buildOpts: {
    linkMode: PlaidLinkMode;
    previous: PlaidPullCompare | null;
    fallbackCash: number | null;
  },
  userId?: string,
  preloadedTxs?: PlaidRawTransaction[],
  cached?: PlaidBankMetrics | null,
): Promise<{ ledgers: ParsedPlaidStatement[]; metrics: PlaidBankMetrics | null }> {
  const txs = preloadedTxs
    ?? await fetchPlaidTransactions(businessId, 'prev_month').catch(() => []);
  const txLedger = ledgerFromRawTransactions(txs, range, 'statement');
  const txLedgers = (txLedger.rows?.length ?? 0) > 0 ? [txLedger] : [];
  const txMetrics = buildPlaidBankMetrics(txLedgers, accounts, range, buildOpts);

  const refreshFromPdfs = async () => {
    let listed: Array<{ year?: number; month?: number }> = [];
    try {
      const pull = await pullPlaidStatements(businessId);
      listed = pull.statements || [];
    } catch {
      return { ledgers: [] as ParsedPlaidStatement[], metrics: null };
    }
    const prevKey = range.start_date.slice(0, 7);
    const match =
      listed.find((row) => `${row.year}-${String(row.month ?? 0).padStart(2, '0')}` === prevKey)
      || listed[0];
    const targetRange =
      match?.year && match.month
        ? rangeFromPeriodKey(`${match.year}-${String(match.month).padStart(2, '0')}`)
        : range;
    const ledgers = await parseStatementLedgers(
      businessId,
      targetRange ?? { preset: 'prev_month' },
    );
    const metrics = buildPlaidBankMetrics(
      ledgers,
      accounts,
      targetRange ?? range,
      buildOpts,
    );
    if (metrics && userId) savePlaidBankMetrics(userId, metrics);
    return { ledgers, metrics };
  };

  if (txMetrics) {
    void refreshFromPdfs().catch(() => undefined);
    return { ledgers: txLedgers, metrics: txMetrics };
  }

  if (cached) {
    void refreshFromPdfs().catch(() => undefined);
    return { ledgers: [], metrics: cached };
  }

  return refreshFromPdfs();
}

function overlayFromStoredTransactions(
  transactions: PlaidRawTransaction[],
  range: StatementRangeRequest,
  accounts: LinkedBankAccount[],
  options: {
    linkMode: PlaidLinkMode;
    previous: PlaidPullCompare | null;
    fallbackCash: number | null;
  },
): { ledgers: ParsedPlaidStatement[]; metrics: PlaidBankMetrics | null } {
  const ledger = ledgerFromRawTransactions(transactions, range);
  const ledgers = (ledger.rows?.length ?? 0) > 0 ? [ledger] : [];
  const metrics = buildPlaidBankMetrics(ledgers, accounts, range, options);
  return { ledgers, metrics };
}

export async function refreshPlaidBankMetricsOverlay(
  businessId: string,
  userId: string,
  options?: { sync?: boolean; persist?: boolean; recordPull?: boolean; mode?: PlaidLinkMode },
): Promise<PlaidBankMetrics | null> {
  const cached = loadPlaidBankMetrics(userId);
  const linkMode = options?.mode ?? cached?.linkMode ?? 'realtime';
  const previous = loadLastPlaidPull(userId);
  const range = pullRangeForMode(linkMode);
  const buildOpts = {
    linkMode,
    previous,
    fallbackCash: cached?.cashAvailable ?? null,
  };

  let accounts: LinkedBankAccount[] = [];
  let ledgers: ParsedPlaidStatement[] = [];
  let metrics: PlaidBankMetrics | null = null;

  if (linkMode === 'monthly') {
    const [loadedAccounts, prevTxs] = await Promise.all([
      fetchLinkedBankAccounts(businessId).catch(() => [] as LinkedBankAccount[]),
      fetchPlaidTransactions(businessId, 'prev_month').catch(() => [] as PlaidRawTransaction[]),
    ]);
    accounts = loadedAccounts;
    const monthly = await overlayFromMonthlyStatements(
      businessId,
      range,
      accounts,
      buildOpts,
      userId,
      prevTxs,
      cached,
    );
    ledgers = monthly.ledgers;
    metrics = monthly.metrics;
  } else {
    const [loadedAccounts, transactions] = await Promise.all([
      fetchLinkedBankAccounts(businessId).catch(() => [] as LinkedBankAccount[]),
      fetchPlaidTransactions(businessId, '1m'),
    ]);
    accounts = loadedAccounts;
    const stored = overlayFromStoredTransactions(transactions, range, accounts, buildOpts);
    ledgers = stored.ledgers;
    metrics = stored.metrics;
    if (options?.sync !== false && !metrics) {
      await syncPlaidTransactions(businessId);
      const afterSync = await overlayFromStoredTransactions(
        await fetchPlaidTransactions(businessId, '1m'),
        range,
        accounts,
        buildOpts,
      );
      ledgers = afterSync.ledgers;
      metrics = afterSync.metrics;
    } else if (options?.sync !== false) {
      void syncPlaidTransactions(businessId)
        .then(async () => {
          const next = overlayFromStoredTransactions(
            await fetchPlaidTransactions(businessId, '1m'),
            range,
            accounts,
            buildOpts,
          );
          if (!next.metrics) return;
          savePlaidBankMetrics(userId, next.metrics);
        })
        .catch(() => undefined);
    }
  }

  if (metrics) {
    savePlaidBankMetrics(userId, metrics);
    if (options?.recordPull) {
      saveLastPlaidPull(userId, toPullCompare(metrics));
    }
  }

  const toStore = ledgers.filter((ledger) => (ledger.rows?.length ?? 0) > 0);
  if (toStore.length && options?.persist !== false) {
    const withPull = toStore.map((ledger) => ({
      ...ledger,
      plaid_pull: metrics
        ? {
            range_start: metrics.rangeStart,
            range_end: metrics.rangeEnd,
            money_in: metrics.moneyIn,
            money_out: metrics.moneyOut,
            cash_available: metrics.cashAvailable,
            compared_range_start: metrics.comparedTo?.rangeStart ?? null,
            compared_range_end: metrics.comparedTo?.rangeEnd ?? null,
            compared_money_in: metrics.comparedTo?.moneyIn ?? null,
            compared_money_out: metrics.comparedTo?.moneyOut ?? null,
            compared_cash_available: metrics.comparedTo?.cashAvailable ?? null,
            pulled_at: metrics.updatedAt,
          }
        : undefined,
    }));
    void parseAndIngestPlaidStatements(withPull, true).catch((err) => {
      console.warn(err instanceof Error ? err.message : 'Bank overlay shown; save skipped.');
    });
  }

  return metrics;
}

function parseUsdAmount(value: string | null | undefined): number | null {
  if (value == null || value === '—') return null;
  const n = Number(String(value).replace(/[$,()\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function plaidMetricsFromSavedReport(
  result: AnalyzeResult,
  linkMode: PlaidLinkMode,
): PlaidBankMetrics | null {
  const brief = extractBriefMetrics(result);
  const cashAvailable = brief.cashAvailable;
  if (cashAvailable == null || !Number.isFinite(cashAvailable)) return null;
  const moneyIn = brief.moneyIn ?? 0;
  const moneyOut = brief.moneyOut ?? 0;
  const cf = getAnalyzeAnalysis(result)?.cash_flow;
  const incomeSlices = (cf?.inflows ?? [])
    .map((row, index) => ({
      id: `bank-in-${index}`,
      label: row.label,
      value: parseUsdAmount(row.value_usd) ?? 0,
    }))
    .filter((row) => row.value > 0);
  const spendSlices = (cf?.outflows ?? [])
    .map((row, index) => ({
      id: `bank-out-${index}`,
      label: row.label,
      value: parseUsdAmount(row.value_usd) ?? 0,
    }))
    .filter((row) => row.value > 0);
  return {
    moneyIn,
    moneyOut,
    cashAvailable,
    openingBalance: null,
    periodLabel: brief.periodLabel,
    rangeStart: '',
    rangeEnd: '',
    spendSlices,
    incomeSlices,
    linkMode,
    updatedAt: new Date().toISOString(),
  };
}

/** Reload overlay KPIs from Plaid ledgers already saved on this account. */
export async function loadPlaidMetricsFromStoredReports(
  linkMode: PlaidLinkMode = 'realtime',
): Promise<PlaidBankMetrics | null> {
  const { data } = await fetchReportHistory();
  const overlays = (data.reports ?? []).filter(isPlaidOverlayReport);
  const latest = pickMostRecentlyUploadedReport(overlays);
  if (!latest?.statement_id) return null;
  const { data: saved } = await fetchSavedReport(latest.statement_id);
  return plaidMetricsFromSavedReport(saved, linkMode);
}

export function savePlaidBankMetrics(userId: string, metrics: PlaidBankMetrics): void {
  try {
    sessionStorage.setItem(storageKey(userId), JSON.stringify(metrics));
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new CustomEvent(PLAID_BANK_METRICS_EVENT, { detail: metrics }));
}

export function loadPlaidBankMetrics(userId: string | null | undefined): PlaidBankMetrics | null {
  if (!userId?.trim()) return null;
  try {
    const raw = sessionStorage.getItem(storageKey(userId.trim()));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlaidBankMetrics;
    if (
      parsed
      && Number.isFinite(parsed.moneyIn)
      && Number.isFinite(parsed.moneyOut)
      && Number.isFinite(parsed.cashAvailable)
    ) {
      return {
        ...parsed,
        linkMode: parsed.linkMode === 'monthly' ? 'monthly' : 'realtime',
        openingBalance: Number.isFinite(parsed.openingBalance) ? parsed.openingBalance : null,
        rangeStart: parsed.rangeStart ?? '',
        rangeEnd: parsed.rangeEnd ?? '',
        spendSlices: Array.isArray(parsed.spendSlices) ? parsed.spendSlices : [],
        incomeSlices: Array.isArray(parsed.incomeSlices) ? parsed.incomeSlices : [],
        comparedTo: parsed.comparedTo ?? null,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function clearPlaidBankMetrics(userId: string | null | undefined): void {
  if (!userId?.trim()) return;
  try {
    sessionStorage.removeItem(storageKey(userId.trim()));
  } catch {
    /* ignore */
  }
  clearLastPlaidPull(userId);
  window.dispatchEvent(new CustomEvent(PLAID_BANK_METRICS_EVENT, { detail: null }));
}

/** Keep POS/ecom upload loaded when bank links — overlay bank KPIs only. */
export async function ensureUploadBaselineSession(_userId: string): Promise<void> {
  try {
    const { data } = await fetchReportHistory();
    const baseline = pickUploadBaselineReport(data.reports ?? []);
    if (!baseline?.statement_id) return;
    const pinned = getActiveStatementViewId()?.trim();
    if (pinned === baseline.statement_id.trim()) return;
    const { data: saved } = await fetchSavedReport(baseline.statement_id);
    window.dispatchEvent(
      new CustomEvent(UPLOAD_BASELINE_RESTORE_EVENT, { detail: saved as AnalyzeResult }),
    );
  } catch {
    /* keep current session */
  }
}

export async function restoreUploadDashboardBaseline(userId: string): Promise<boolean> {
  clearPlaidBankMetrics(userId);
  invalidateReportHistoryCache();
  try {
    const { data } = await fetchReportHistory();
    const baseline = pickUploadBaselineReport(data.reports ?? []);
    if (!baseline?.statement_id) return false;
    const { data: saved } = await fetchSavedReport(baseline.statement_id);
    window.dispatchEvent(
      new CustomEvent(UPLOAD_BASELINE_RESTORE_EVENT, { detail: saved as AnalyzeResult }),
    );
    return true;
  } catch {
    return false;
  }
}
