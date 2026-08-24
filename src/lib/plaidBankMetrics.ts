import { comparePeriodKeys, pickUploadBaselineReport } from './atLetterStatement';
import type { AnalyzeResult } from './analyzeResponse';
import { getActiveStatementViewId } from './activeStatementView';
import {
  fetchReportHistory,
  fetchSavedReport,
  invalidateReportHistoryCache,
} from './api';
import type { LinkedBankAccount, ParsedPlaidStatement } from './plaidClient';
import {
  parseAllPlaidData,
  parseAllPlaidBankStatements,
  parseAllPlaidTransactions,
  fetchLinkedBankAccounts,
  refreshLinkedBankBalances,
  syncBankTransactions,
  pullBankStatements,
} from './plaidClient';
import {
  resolveStatementRange,
  statementRangeToRequest,
  previousCalendarMonthRequest,
  type StatementRangeRequest,
} from './statementRange';

export type PlaidLinkMode = 'realtime' | 'monthly';

export { previousCalendarMonthRequest };

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

export type PlaidBankMetrics = {
  moneyIn: number;
  moneyOut: number;
  cashAvailable: number;
  /** Bank-reported opening only (statement PDF). Null when unknown. */
  openingBalance: number | null;
  periodLabel: string;
  rangeStart: string;
  rangeEnd: string;
  spendSlices: PlaidSpendSlice[];
  incomeSlices: PlaidIncomeSlice[];
  linkMode: PlaidLinkMode;
  updatedAt: string;
};

const STORAGE_PREFIX = 'asktill:plaid-bank-metrics:';

export const PLAID_BANK_METRICS_EVENT = 'asktill:plaid-bank-metrics';

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId.trim()}`;
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

/** Calendar month start through today — dashboard bank overlay window. */
export function monthToDateRange(): StatementRangeRequest {
  return statementRangeToRequest(resolveStatementRange('1m'));
}

function formatUsMonthDay(isoDate: string): string | null {
  const [y, m, d] = isoDate.split('-').map((part) => Number(part));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
  });
}

/** KPI footnote for linked bank overlay. */
export function formatBankLinkedFootnote(
  metrics: Pick<
    PlaidBankMetrics,
    'linkMode' | 'rangeStart' | 'rangeEnd' | 'periodLabel'
  >,
): string {
  if (metrics.linkMode === 'monthly') {
    const label = metrics.periodLabel?.trim().replace(/^Bank · /, '');
    if (label) return `Linked bank · ${label}`;
    if (metrics.rangeStart?.slice(0, 7)) {
      const [y, m] = metrics.rangeStart.slice(0, 7).split('-').map(Number);
      if (y && m) {
        const monthName = new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long' });
        return `Linked bank · ${monthName} ${y}`;
      }
    }
    return 'Linked bank · previous month statement';
  }

  const rangeStart = metrics.rangeStart;
  const rangeEnd = metrics.rangeEnd;
  if (!rangeStart?.trim() || !rangeEnd?.trim()) {
    return 'Linked bank · month to date';
  }

  const startText = formatUsMonthDay(rangeStart.trim());
  const endText = formatUsMonthDay(rangeEnd.trim());
  if (!startText || !endText) return 'Linked bank · month to date';

  return `Linked bank · ${startText} to ${endText}`;
}

function statementMonthLabel(rangeStart: string): string {
  const [y, m] = rangeStart.slice(0, 7).split('-').map(Number);
  if (!y || !m) return 'Previous month';
  return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function mtdPeriodLabel(endDate: string): string {
  const [year, month, day] = endDate.split('-').map((part) => Number(part));
  if (!year || !month || !day) return 'Bank · month to date';
  const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' });
  return `${monthName} ${year} (through ${month}/${day}/${year})`;
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
): ParsedPlaidStatement | null {
  const startDate = range.start_date?.trim();
  const endDate = range.end_date?.trim();
  if (!startDate || !endDate) return ledger;

  const rows = (ledger.rows ?? []).filter((row) => {
    const day = row.date?.slice(0, 10);
    return day && day >= startDate && day <= endDate;
  });
  if (!rows.length) return null;

  const totalCredits = Math.round(sumRowsCredits(rows) * 100) / 100;
  const totalDebits = Math.round(sumRowsDebits(rows) * 100) / 100;
  const periodKey = endDate.slice(0, 7);

  return {
    ...ledger,
    rows,
    total_credits: totalCredits,
    total_debits: totalDebits,
    period: {
      ...ledger.period,
      key: periodKey,
      label: mtdPeriodLabel(endDate),
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
      ledger.ok
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
      ledger.ok
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

  const sorted = [...buckets.entries()]
    .map(([label, value], index) => ({
      id: `bank-in-${index}`,
      label,
      value: Math.round(value * 100) / 100,
    }))
    .sort((a, b) => b.value - a.value);

  const maxSlices = 6;
  if (sorted.length <= maxSlices) return sorted;

  const top = sorted.slice(0, maxSlices - 1);
  const otherTotal = sorted
    .slice(maxSlices - 1)
    .reduce((sum, slice) => sum + slice.value, 0);
  top.push({
    id: 'bank-in-other',
    label: 'Other',
    value: Math.round(otherTotal * 100) / 100,
  });
  return top;
}

function isLiveOpeningBalance(ledger: ParsedPlaidStatement): boolean {
  const filename = ledger.filename ?? '';
  if (filename.includes('plaid_transactions') || filename.includes('plaid_tx_')) {
    return false;
  }
  return ledger.opening_balance != null && Number.isFinite(ledger.opening_balance);
}

function buildSpendSlicesFromLedger(ledger: ParsedPlaidStatement): PlaidSpendSlice[] {
  const buckets = new Map<string, number>();
  for (const row of ledger.rows ?? []) {
    const debit = row.debit || 0;
    if (debit <= 0) continue;
    const label = row.description?.trim() || 'Bank outflow';
    buckets.set(label, (buckets.get(label) ?? 0) + debit);
  }

  const sorted = [...buckets.entries()]
    .map(([label, value], index) => ({
      id: `bank-out-${index}`,
      label,
      value: Math.round(value * 100) / 100,
    }))
    .sort((a, b) => b.value - a.value);

  const maxSlices = 6;
  if (sorted.length <= maxSlices) return sorted;

  const top = sorted.slice(0, maxSlices - 1);
  const otherTotal = sorted
    .slice(maxSlices - 1)
    .reduce((sum, slice) => sum + slice.value, 0);
  top.push({
    id: 'bank-out-other',
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

/** Month-to-date Money In / Out / Available from parsed Plaid ledgers + live balances. */
export function buildPlaidBankMetrics(
  ledgers: ParsedPlaidStatement[],
  accounts: LinkedBankAccount[],
  range?: StatementRangeRequest,
  options?: { linkMode?: PlaidLinkMode },
): PlaidBankMetrics | null {
  const linkMode = options?.linkMode ?? 'realtime';
  const picked =
    linkMode === 'monthly' && range
      ? pickStatementLedger(ledgers, range)
      : pickMtdLedger(ledgers);
  if (!picked) return null;

  const scoped =
    linkMode === 'monthly' || !range ? picked : clipLedgerToRange(picked, range);
  if (!scoped) return null;

  const moneyIn = Math.round(sumRowsCredits(scoped.rows) * 100) / 100;
  const moneyOut = Math.round(sumRowsDebits(scoped.rows) * 100) / 100;
  const fromAccounts = sumAvailableBalance(accounts);
  const fromStatementClosing =
    linkMode === 'monthly'
    && scoped.closing_balance != null
    && Number.isFinite(scoped.closing_balance)
      ? scoped.closing_balance
      : null;
  const cashAvailable = fromAccounts ?? fromStatementClosing;
  if (cashAvailable == null) return null;

  const rangeStart = range?.start_date?.trim() ?? '';
  const rangeEnd = range?.end_date?.trim() ?? '';

  const periodLabel =
    linkMode === 'monthly'
      ? (scoped.period?.label?.trim() || (rangeStart ? statementMonthLabel(rangeStart) : 'Previous month'))
      : scoped.period?.label?.trim()
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

  return {
    moneyIn,
    moneyOut,
    cashAvailable,
    openingBalance,
    periodLabel,
    rangeStart,
    rangeEnd,
    spendSlices,
    incomeSlices,
    linkMode,
    updatedAt: new Date().toISOString(),
  };
}

/** Sync + parse bank data and refresh the dashboard KPI overlay. */
export async function refreshPlaidBankMetricsOverlay(
  businessId: string,
  userId: string,
  options?: { sync?: boolean; mode?: PlaidLinkMode },
): Promise<PlaidBankMetrics | null> {
  const cached = loadPlaidBankMetrics(userId);
  const linkMode = options?.mode ?? cached?.linkMode ?? 'realtime';
  const sync = options?.sync !== false;

  if (linkMode === 'monthly') {
    const range = previousCalendarMonthRequest();
    if (sync) {
      await refreshLinkedBankBalances(businessId);
      await pullBankStatements(businessId, range);
    }
    const { statements } = await parseAllPlaidBankStatements(businessId, range);
    const ledgers = statements.filter((ledger) => ledger.ok);
    if (!ledgers.length) {
      const fallback = await parseAllPlaidData(businessId, range, { sync: false });
      ledgers.push(...fallback.ledgers.filter((ledger) => ledger.ok));
    }
    const accounts = await fetchLinkedBankAccounts(businessId);
    const metrics = buildPlaidBankMetrics(ledgers, accounts, range, { linkMode: 'monthly' });
    if (metrics) savePlaidBankMetrics(userId, metrics);
    return metrics;
  }

  const range = monthToDateRange();
  if (sync) {
    await refreshLinkedBankBalances(businessId);
    await syncBankTransactions(businessId);
  }

  let ledgers = (await parseAllPlaidTransactions(businessId, range, { sync: false })).ledgers;
  const hasTxRows = ledgers.some((ledger) => ledger.ok && (ledger.rows?.length ?? 0) > 0);
  if (!hasTxRows) {
    ledgers = (await parseAllPlaidData(businessId, range, { sync: false })).ledgers;
  }

  const accounts = await fetchLinkedBankAccounts(businessId);
  const metrics = buildPlaidBankMetrics(ledgers, accounts, range, { linkMode: 'realtime' });
  if (metrics) savePlaidBankMetrics(userId, metrics);
  return metrics;
}

export function savePlaidBankMetrics(userId: string, metrics: PlaidBankMetrics): void {
  try {
    sessionStorage.setItem(storageKey(userId), JSON.stringify(metrics));
  } catch {
    /* private mode */
  }
  window.dispatchEvent(
    new CustomEvent(PLAID_BANK_METRICS_EVENT, { detail: metrics }),
  );
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
  window.dispatchEvent(new CustomEvent(PLAID_BANK_METRICS_EVENT, { detail: null }));
}

/** Reload saved upload dashboard after banks disconnected (drops live bank overlay). */
export const UPLOAD_BASELINE_RESTORE_EVENT = 'asktill:upload-baseline-restore';

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
