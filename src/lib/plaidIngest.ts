import { ingestPlaidParsedStatements, invalidateReportHistoryCache, fetchSavedReport, type PlaidIngestApiResponse } from './api';
import { pinActiveStatementView } from './activeStatementView';
import { comparePeriodKeys, periodKeyFromLabel } from './atLetterStatement';
import {
  parseAllPlaidBankStatements,
  parseAllPlaidData,
  parseAllPlaidTransactions,
  type ParsedPlaidStatement,
} from './plaidClient';
import type { StatementRangeRequest } from './statementRange';
import {
  markJustAnalyzed,
  REPORT_HISTORY_REFRESH_EVENT,
} from '../hooks/useReportSync';

import type { AnalyzeResult } from './analyzeResponse';

function okLedgers(ledgers: ParsedPlaidStatement[]): ParsedPlaidStatement[] {
  return ledgers.filter((s) => s.ok && (s.rows?.length ?? 0) > 0);
}

/** Download PDFs from Plaid → parse (Plaid-Statement-Parser) → save via backend analyze. */
export async function parseAndIngestPlaidStatements(
  businessId: string,
  range?: StatementRangeRequest,
  options?: { force?: boolean },
): Promise<{
  parsed: ParsedPlaidStatement[];
  ingest: Awaited<ReturnType<typeof ingestPlaidParsedStatements>> | null;
}> {
  const { statements: parsed } = await parseAllPlaidBankStatements(businessId, range);
  const okStatements = okLedgers(parsed);
  if (!okStatements.length) {
    return { parsed, ingest: null };
  }
  const ingest = await ingestPlaidParsedStatements(okStatements, options?.force ?? false);
  return { parsed, ingest };
}

/** Sync + parse Plaid transactions via parser service → backend analyze. */
export async function parseAndIngestPlaidTransactions(
  businessId: string,
  range?: StatementRangeRequest,
  options?: { force?: boolean; sync?: boolean },
): Promise<{
  parsed: ParsedPlaidStatement[];
  ingest: Awaited<ReturnType<typeof ingestPlaidParsedStatements>> | null;
}> {
  const result = await parseAllPlaidTransactions(businessId, range, {
    sync: options?.sync,
  });
  const parsed = result.ledgers;
  const okStatements = okLedgers(parsed);
  if (!okStatements.length) {
    return { parsed, ingest: null };
  }
  const ingest = await ingestPlaidParsedStatements(okStatements, options?.force ?? false);
  return { parsed, ingest };
}

/**
 * Parse statement PDFs + transactions through one parser repo, dedupe by month (PDF wins),
 * then ingest to backend analyze.
 */
export async function parseAndIngestAllPlaidData(
  businessId: string,
  range?: StatementRangeRequest,
  options?: { force?: boolean; sync?: boolean },
): Promise<{
  parsed: ParsedPlaidStatement[];
  statements: ParsedPlaidStatement[];
  transactions: ParsedPlaidStatement[];
  ingest: Awaited<ReturnType<typeof ingestPlaidParsedStatements>> | null;
}> {
  const data = await parseAllPlaidData(businessId, range, { sync: options?.sync });
  const okLedgersList = okLedgers(data.ledgers);
  if (!okLedgersList.length) {
    return {
      parsed: data.ledgers,
      statements: data.statements,
      transactions: data.transactions,
      ingest: null,
    };
  }
  const ingest = await ingestPlaidParsedStatements(okLedgersList, options?.force ?? false);
  return {
    parsed: data.ledgers,
    statements: data.statements,
    transactions: data.transactions,
    ingest,
  };
}

/** Newest saved statement id from a Plaid ingest batch (by period_key). */
export function newestIngestedStatementId(
  ingest: PlaidIngestApiResponse | null | undefined,
): string | null {
  const rows = (ingest?.ingested ?? []).filter(
    (row) => row.ok && row.saved_statement_id?.trim(),
  );
  if (!rows.length) return null;
  const periodKey = (row: (typeof rows)[number]) =>
    row.period_key?.trim() || periodKeyFromLabel(row.period_label) || null;
  const sorted = [...rows].sort((a, b) => comparePeriodKeys(periodKey(a), periodKey(b)));
  return sorted[0]?.saved_statement_id?.trim() ?? null;
}

/** User-facing message when parse succeeded but backend ingest failed. */
export function plaidIngestFailureMessage(
  ingest: PlaidIngestApiResponse | null | undefined,
): string | null {
  const failed = (ingest?.ingested ?? []).filter((row) => !row.ok);
  if (!failed.length) return null;
  const raw = failed[0]?.error?.trim() || '';
  if (/entitlements/i.test(raw)) {
    return 'Bank data parsed but could not save — billing check unavailable. Retry in a moment.';
  }
  if (raw) return `Bank data parsed but could not save: ${raw}`;
  return 'Bank data parsed but could not save to your dashboard.';
}

function notifyDashboardRefresh(): void {
  invalidateReportHistoryCache();
  markJustAnalyzed();
  window.dispatchEvent(new CustomEvent(REPORT_HISTORY_REFRESH_EVENT));
}

/** Pin + load newest ingested month so Business Brief shows fresh Plaid data. */
export async function applyPlaidIngestToDashboard(
  ingest: PlaidIngestApiResponse | null | undefined,
): Promise<void> {
  const statementId = newestIngestedStatementId(ingest);
  if (!statementId) {
    notifyDashboardRefresh();
    return;
  }
  pinActiveStatementView(statementId);
  try {
    const { data } = await fetchSavedReport(statementId);
    window.dispatchEvent(new CustomEvent(PLAID_DASHBOARD_LOAD_EVENT, { detail: data }));
  } catch {
    notifyDashboardRefresh();
  }
}

/** AnalysisContext loads this after Plaid link/sync ingest. */
export const PLAID_DASHBOARD_LOAD_EVENT = 'asktill:plaid-dashboard-load';

export type PlaidDashboardLoadDetail = AnalyzeResult;
