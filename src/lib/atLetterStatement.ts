import type { SavedReportSummaryApi } from './api';

const MONTH_TO_NUM: Record<string, string> = {
  january: '01',
  february: '02',
  march: '03',
  april: '04',
  may: '05',
  june: '06',
  july: '07',
  august: '08',
  september: '09',
  october: '10',
  november: '11',
  december: '12',
};

/** Compare YYYY-MM period keys — negative when `a` is newer than `b`. */
export function comparePeriodKeys(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  const ak = (a ?? '').trim();
  const bk = (b ?? '').trim();
  if (ak && bk) return bk.localeCompare(ak);
  if (ak) return -1;
  if (bk) return 1;
  return 0;
}

export function periodKeyFromLabel(label: string | null | undefined): string | null {
  if (!label?.trim()) return null;
  const text = label.trim();
  const iso = text.match(/\b(20\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}`;
  const named = text.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i,
  );
  if (named) {
    const month = MONTH_TO_NUM[named[1].toLowerCase()];
    if (month) return `${named[2]}-${month}`;
  }
  return null;
}

/** Latest saved report — prefer newest statement period, then upload time. */
export function pickPrimarySavedReport(
  reports: SavedReportSummaryApi[],
): SavedReportSummaryApi | null {
  if (!reports.length) return null;
  return [...reports].sort((a, b) => {
    const byPeriod = comparePeriodKeys(a.period_key, b.period_key);
    if (byPeriod !== 0) return byPeriod;
    return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
  })[0];
}

/**
 * Pick the statement id for AT Letter — anchor on newest saved month once history is loaded.
 * Fresh analyze wins during grace, when its period is newer, or when the same month was re-uploaded.
 */
export function resolveAtLetterStatementId(options: {
  sessionStatementId?: string | null;
  sessionPeriodKey?: string | null;
  primaryReport?: SavedReportSummaryApi | null;
  historyReady?: boolean;
  /** True right after analyze — keep the in-flight statement id until history catches up. */
  preferSession?: boolean;
  /** User explicitly opened this statement (duplicate banner, previous reports, etc.). */
  activeViewId?: string | null;
}): string | undefined {
  const sessionId = options.sessionStatementId?.trim();
  const sessionKey = options.sessionPeriodKey?.trim() || null;
  const history = options.primaryReport;
  const historyId = history?.statement_id?.trim();
  const historyKey = history?.period_key?.trim() || null;
  const historyReady = options.historyReady !== false;
  const activeViewId = options.activeViewId?.trim();

  if (sessionId && (options.preferSession || activeViewId === sessionId)) {
    return sessionId;
  }

  if (historyId && historyReady) {
    if (sessionId) {
      if (sessionKey && historyKey) {
        const periodCmp = comparePeriodKeys(sessionKey, historyKey);
        if (periodCmp < 0) return sessionId;
        if (periodCmp === 0 && sessionId !== historyId) return sessionId;
      } else if (!historyKey || !sessionKey) {
        return sessionId;
      }
    }
    return historyId;
  }

  if (sessionId) return sessionId;
  if (historyId) return historyId;
  return undefined;
}

/** True when in-memory analyze is for the newest saved period (safe to show in Sarah card). */
export function sessionAnalyzeIsLatest(options: {
  sessionPeriodKey?: string | null;
  primaryReport?: SavedReportSummaryApi | null;
}): boolean {
  const sessionKey = options.sessionPeriodKey?.trim() || null;
  const historyKey = options.primaryReport?.period_key?.trim() || null;
  if (!sessionKey) return false;
  if (!historyKey) return false;
  return comparePeriodKeys(sessionKey, historyKey) <= 0;
}

export function atLetterFooterMeta(
  report: SavedReportSummaryApi | null | undefined,
  fallbackBusiness?: string | null,
): string {
  if (!report) return fallbackBusiness?.trim() || 'Your business';
  const parts = [report.period_label, report.business_name ?? fallbackBusiness].filter(Boolean);
  return parts.join(' · ') || 'Your business';
}
