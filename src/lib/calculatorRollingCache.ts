import type { AnalyzeResult } from './analyzeResponse';
import { getAnalyzeAnalysis } from './analyzeResponse';

/**
 * Survives CalculatorsPage unmount (tab changes) so "Last 3 months"
 * does not refetch / flash loading on every hover or revisit.
 */
const reportById = new Map<string, AnalyzeResult>();
const windowByKey = new Map<string, AnalyzeResult[]>();

export function getCachedCalculatorReport(statementId: string): AnalyzeResult | undefined {
  const hit = reportById.get(statementId);
  if (hit && getAnalyzeAnalysis(hit)) return hit;
  return undefined;
}

export function putCachedCalculatorReport(result: AnalyzeResult): void {
  const id = result.statement_id?.trim();
  if (!id || !getAnalyzeAnalysis(result)) return;
  reportById.set(id, result);
}

export function getCachedRollingWindow(windowKey: string): AnalyzeResult[] | undefined {
  const hit = windowByKey.get(windowKey);
  if (!hit?.length) return undefined;
  if (!hit.every((r) => getAnalyzeAnalysis(r))) return undefined;
  return hit;
}

export function putCachedRollingWindow(windowKey: string, results: AnalyzeResult[]): void {
  if (!windowKey || !results.length) return;
  if (!results.every((r) => getAnalyzeAnalysis(r))) return;
  windowByKey.set(windowKey, results);
  for (const r of results) putCachedCalculatorReport(r);
}

export function rollingWindowKey(statementIds: string[]): string {
  return statementIds.join('|');
}
