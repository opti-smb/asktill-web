import { ingestPlaidParsedStatements } from './api';
import {
  parseAllPlaidBankStatements,
  parseAllPlaidData,
  parseAllPlaidTransactions,
  type ParsedPlaidStatement,
} from './plaidClient';
import type { StatementRangeRequest } from './statementRange';

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
