export type StatementRangePreset =
  | '1m'
  | '2m'
  | '3m'
  | '6m'
  | '365d'
  | 'all'
  | 'custom'
  | 'prev_month';

export type StatementRange = {
  preset: StatementRangePreset;
  startDate: string;
  endDate: string;
};

export type StatementRangeRequest = {
  start_date: string;
  end_date: string;
  preset?: StatementRangePreset;
};

export type CustomMonthRange = {
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
};

export const STATEMENT_RANGE_OPTIONS: {
  preset: StatementRangePreset;
  label: string;
}[] = [
  { preset: '1m', label: 'Last 1 month' },
  { preset: '2m', label: 'Last 2 months' },
  { preset: '3m', label: 'Last 3 months' },
  { preset: '6m', label: 'Last 6 months' },
  { preset: '365d', label: 'Last 365 days' },
  { preset: 'all', label: 'All available' },
  { preset: 'custom', label: 'Custom range…' },
];

const RANGE_STORAGE_KEY = 'asktill:stmt-range';
const MAX_ALL_MONTHS = 24;
const MIN_YEAR = 2000;

/** Local calendar date — avoids UTC shift from toISOString() (e.g. IST showing prior month). */
export function isoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addCalendarMonths(from: Date, months: number): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() - months);
  return d;
}

function addDays(from: Date, days: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() - days);
  return d;
}

function calendarMonthsRange(monthCount: number, today = new Date()): { start: Date; end: Date } {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  start.setMonth(start.getMonth() - (monthCount - 1));
  return { start, end };
}

export function monthIndex(year: number, month: number): number {
  return year * 12 + (month - 1);
}

function calendarMonthCount(preset: StatementRangePreset): number | null {
  if (preset === '1m') return 1;
  if (preset === '2m') return 2;
  if (preset === '3m') return 3;
  if (preset === '6m') return 6;
  return null;
}

export function defaultCustomMonthRange(today = new Date()): CustomMonthRange {
  const endYear = today.getFullYear();
  const endMonth = today.getMonth() + 1;
  const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
  return {
    startYear: start.getFullYear(),
    startMonth: start.getMonth() + 1,
    endYear,
    endMonth,
  };
}

export function customRangeFromMonths(custom: CustomMonthRange): StatementRange {
  let { startYear, startMonth, endYear, endMonth } = custom;
  let startIdx = monthIndex(startYear, startMonth);
  let endIdx = monthIndex(endYear, endMonth);
  if (startIdx > endIdx) {
    [startIdx, endIdx] = [endIdx, startIdx];
    startYear = Math.floor(startIdx / 12);
    startMonth = (startIdx % 12) + 1;
    endYear = Math.floor(endIdx / 12);
    endMonth = (endIdx % 12) + 1;
  }
  const startDate = isoDateLocal(new Date(startYear, startMonth - 1, 1));
  const endDate = isoDateLocal(new Date(endYear, endMonth, 0));
  return { preset: 'custom', startDate, endDate };
}

export function isValidCustomMonthRange(custom: CustomMonthRange): boolean {
  const years = [custom.startYear, custom.endYear];
  const maxYear = new Date().getFullYear() + 1;
  if (years.some((y) => y < MIN_YEAR || y > maxYear)) return false;
  if (custom.startMonth < 1 || custom.startMonth > 12) return false;
  if (custom.endMonth < 1 || custom.endMonth > 12) return false;
  return true;
}

/** Full previous calendar month — bank stmt PDFs arrive monthly (e.g. link in Aug → July stmt). */
export function previousCalendarMonthRange(today = new Date()): StatementRange {
  const anchor = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const year = anchor.getFullYear();
  const month = anchor.getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();
  const mm = String(month).padStart(2, '0');
  const dd = String(lastDay).padStart(2, '0');
  return {
    preset: 'prev_month',
    startDate: `${year}-${mm}-01`,
    endDate: `${year}-${mm}-${dd}`,
  };
}

export function previousCalendarMonthRequest(today = new Date()): StatementRangeRequest {
  return statementRangeToRequest(previousCalendarMonthRange(today));
}

export function resolveStatementRange(
  preset: StatementRangePreset,
  custom?: CustomMonthRange,
  today = new Date(),
): StatementRange {
  const endDate = isoDateLocal(today);

  if (preset === 'custom') {
    if (custom && isValidCustomMonthRange(custom)) {
      return customRangeFromMonths(custom);
    }
    return customRangeFromMonths(defaultCustomMonthRange(today));
  }

  if (preset === '1m' || preset === '2m' || preset === '3m' || preset === '6m') {
    const count = calendarMonthCount(preset)!;
    const { start, end } = calendarMonthsRange(count, today);
    return { preset, startDate: isoDateLocal(start), endDate: isoDateLocal(end) };
  }

  if (preset === 'prev_month') {
    return previousCalendarMonthRange(today);
  }

  let start: Date;
  switch (preset) {
    case '365d':
      start = addDays(today, 365);
      break;
    case 'all':
    default:
      start = addCalendarMonths(today, MAX_ALL_MONTHS);
      break;
  }

  return { preset, startDate: isoDateLocal(start), endDate };
}

export function statementInRange(
  year: number,
  month: number,
  range: StatementRange,
  today = new Date(),
): boolean {
  const count = calendarMonthCount(range.preset);
  if (count !== null) {
    const stmtIdx = monthIndex(year, month);
    const currentIdx = monthIndex(today.getFullYear(), today.getMonth() + 1);
    return stmtIdx >= currentIdx - (count - 1) && stmtIdx <= currentIdx;
  }

  const parts = (iso: string) => iso.split('-').map((n) => Number(n));
  const [sy, sm, sd] = parts(range.startDate);
  const [ey, em, ed] = parts(range.endDate);
  if (!sy || !sm || !ey || !em) return false;

  const start = new Date(sy, sm - 1, sd || 1);
  const end = new Date(ey, em - 1, ed || 1, 23, 59, 59);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);
  return monthEnd >= start && monthStart <= end;
}

export function filterStatementsByRange<T extends { year: number; month: number }>(
  statements: T[],
  range: StatementRange,
): T[] {
  return statements.filter((st) => statementInRange(st.year, st.month, range));
}

export function statementRangeToRequest(range: StatementRange): StatementRangeRequest {
  return {
    preset: range.preset,
    start_date: range.startDate,
    end_date: range.endDate,
  };
}

export function statementRangeLabel(range: StatementRange): string {
  const opt = STATEMENT_RANGE_OPTIONS.find((o) => o.preset === range.preset);
  if (range.preset === 'custom') {
    return `${range.startDate} → ${range.endDate}`;
  }
  return opt?.label || `${range.startDate} → ${range.endDate}`;
}

type SavedRangePreference = {
  preset?: StatementRangePreset;
  custom?: CustomMonthRange;
};

export function loadStatementRangePreference(businessId: string): {
  preset: StatementRangePreset;
  custom: CustomMonthRange;
} {
  try {
    const raw = localStorage.getItem(`${RANGE_STORAGE_KEY}:${businessId}`);
    if (!raw) {
      const custom = defaultCustomMonthRange();
      return { preset: '3m', custom };
    }
    const parsed = JSON.parse(raw) as SavedRangePreference;
    const preset = parsed.preset || '3m';
    const custom =
      parsed.custom && isValidCustomMonthRange(parsed.custom)
        ? parsed.custom
        : defaultCustomMonthRange();
    return { preset, custom };
  } catch {
    return { preset: '3m', custom: defaultCustomMonthRange() };
  }
}

export function saveStatementRangePreference(
  businessId: string,
  preset: StatementRangePreset,
  custom: CustomMonthRange,
): void {
  try {
    localStorage.setItem(
      `${RANGE_STORAGE_KEY}:${businessId}`,
      JSON.stringify({ preset, custom }),
    );
  } catch {
    /* ignore */
  }
}

export function yearOptions(count = 12, today = new Date()): number[] {
  const current = today.getFullYear();
  return Array.from({ length: count }, (_, i) => current - i);
}
