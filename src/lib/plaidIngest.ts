import { ingestPlaidParsedStatements } from './api';

export async function parseAndIngestPlaidStatements(
  ledgers: unknown[] | undefined,
    force = true,
) {
  const statements = (ledgers || []).filter(Boolean);
  if (!statements.length) {
    return { ingested: [], success_count: 0, failure_count: 0 };
  }
  return ingestPlaidParsedStatements(statements, force);
}
