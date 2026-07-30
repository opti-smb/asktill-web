import type { AnalyzeResult } from './analyzeResponse';
import { getAnalyzeAnalysis } from './analyzeResponse';

/**
 * Survives CalculatorsPage unmount and soft reloads within the tab.
 * "Last 3 months" should load once, then open instantly on hover/revisit.
 */
const reportById = new Map<string, AnalyzeResult>();
const windowByKey = new Map<string, AnalyzeResult[]>();

const SS_REPORT_PREFIX = 'asktill:calc-report:';
const SS_WINDOW_PREFIX = 'asktill:calc-window:';

function readSs<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeSs(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

export function getCachedCalculatorReport(statementId: string): AnalyzeResult | undefined {
  const id = statementId.trim();
  if (!id) return undefined;
  const mem = reportById.get(id);
  if (mem && getAnalyzeAnalysis(mem)) return mem;
  const ss = readSs<AnalyzeResult>(`${SS_REPORT_PREFIX}${id}`);
  if (ss && getAnalyzeAnalysis(ss)) {
    reportById.set(id, ss);
    return ss;
  }
  return undefined;
}

export function putCachedCalculatorReport(result: AnalyzeResult): void {
  const id = result.statement_id?.trim();
  if (!id || !getAnalyzeAnalysis(result)) return;
  reportById.set(id, result);
  writeSs(`${SS_REPORT_PREFIX}${id}`, result);
}

export function getCachedRollingWindow(windowKey: string): AnalyzeResult[] | undefined {
  if (!windowKey) return undefined;
  const mem = windowByKey.get(windowKey);
  if (mem?.length && mem.every((r) => getAnalyzeAnalysis(r))) return mem;
  const ss = readSs<AnalyzeResult[]>(`${SS_WINDOW_PREFIX}${windowKey}`);
  if (ss?.length && ss.every((r) => getAnalyzeAnalysis(r))) {
    windowByKey.set(windowKey, ss);
    for (const r of ss) putCachedCalculatorReport(r);
    return ss;
  }
  return undefined;
}

export function putCachedRollingWindow(windowKey: string, results: AnalyzeResult[]): void {
  if (!windowKey || !results.length) return;
  if (!results.every((r) => getAnalyzeAnalysis(r))) return;
  windowByKey.set(windowKey, results);
  writeSs(`${SS_WINDOW_PREFIX}${windowKey}`, results);
  for (const r of results) putCachedCalculatorReport(r);
}

export function rollingWindowKey(statementIds: string[]): string {
  return statementIds.filter(Boolean).join('|');
}
