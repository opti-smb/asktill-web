import type { AuthUser, SavedReportSummaryApi } from './api';
import type { AnalyzeResult, StandardInsight, UiAnalysisView } from './analyzeResponse';

export type AtLetterMode = 'sample' | 'live' | 'empty';

export interface AtLetterPreview {
  mode: AtLetterMode;
  firstName: string;
  letterDateLabel: string;
  periodIntro: string;
  broughtIn: string;
  spent: string;
  kept: string;
  summary: string;
  summaryEmphasis?: string;
  watchTitle: string;
  watchText: string;
  actionTitle: string;
  actionText: string;
  closingLine: string;
  footerMeta: string;
  statementId?: string;
  hasPdf?: boolean;
}

export const SAMPLE_AT_LETTER: AtLetterPreview = {
  mode: 'sample',
  firstName: 'Sarah',
  letterDateLabel: 'May 2026 · AT Letter',
  periodIntro: "Here's your April in plain English.",
  broughtIn: '$28,400',
  spent: '$24,100',
  kept: '$4,300',
  summary:
    "Revenue up 11% and operating costs stayed flat — that's exactly what healthy growth looks like.",
  summaryEmphasis: 'best month in 6 months.',
  watchTitle: 'One thing to watch',
  watchText:
    'Card processing fees up $340 this month. Call your processor — you may be on an old rate plan.',
  actionTitle: "This month's one action",
  actionText: '3 unused subscriptions = $290/mo. Cancel them → $3,480/yr back in your pocket.',
  closingLine: "You're on track. Keep going.",
  footerMeta: 'April 2026 · Bakery & Café, Austin TX',
};

function fmtUsd(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function firstNameFromUser(user: AuthUser | null | undefined): string {
  const raw = user?.name?.trim();
  if (raw) {
    const part = raw.split(/\s+/)[0];
    if (part) return part.charAt(0).toUpperCase() + part.slice(1);
  }
  const email = user?.email?.trim();
  if (email) {
    const local = email.split('@')[0] ?? '';
    const token = local.split(/[._+-]/)[0];
    if (token) return token.charAt(0).toUpperCase() + token.slice(1);
  }
  return 'there';
}

function periodMonthName(periodLabel: string | null | undefined): string {
  if (!periodLabel?.trim()) return 'your last period';
  const match = periodLabel.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/i);
  if (match) return match[1];
  const short = periodLabel.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i);
  if (short) return short[1];
  return periodLabel.trim();
}

function totalCashDeposited(analysis: UiAnalysisView | null | undefined): number | null {
  const cb = analysis?.channel_breakdown;
  if (cb) {
    const pos = cb.pos?.deposited_to_bank ?? cb.pos?.net_to_bank;
    const ecom = cb.ecommerce?.deposited_to_bank ?? cb.ecommerce?.net_to_bank;
    const total = (pos ?? 0) + (ecom ?? 0);
    if (total > 0.01) return Math.round(total * 100) / 100;
  }
  const depKpi = analysis?.kpis?.find((k) => /cash deposited|deposited to bank/i.test(k.label ?? ''));
  if (typeof depKpi?.value === 'number' && depKpi.value > 0) return depKpi.value;
  return null;
}

function pickWatchInsight(insights: StandardInsight[]): StandardInsight | null {
  const warn = insights.find((i) => i.severity === 'warn');
  if (warn) return warn;
  return (
    insights.find((i) => /anomaly|fee|gap|watch/i.test(i.tag)) ??
    insights.find((i) => i.tag === 'Highest fee') ??
    null
  );
}

function pickActionInsight(insights: StandardInsight[], skipId?: string): StandardInsight | null {
  return (
    insights.find((i) => i.id !== skipId && /runway|best day|action|payroll|subscription/i.test(i.tag)) ??
    insights.find((i) => i.id !== skipId && i.severity !== 'warn') ??
    null
  );
}

function hasLetterData(analysis: UiAnalysisView | null | undefined): boolean {
  if (!analysis) return false;
  const cf = analysis.cash_flow;
  if (cf?.money_in != null || cf?.money_out != null || cf?.cash_on_hand != null) return true;
  if (analysis.kpis?.some((k) => k.value != null)) return true;
  if (analysis.standard_insights?.length) return true;
  if (analysis.financial_summary) return true;
  return false;
}

export function buildAtLetterFromSummary(
  summary: SavedReportSummaryApi,
  user: AuthUser | null | undefined,
): AtLetterPreview {
  const firstName = firstNameFromUser(user);
  const periodName = periodMonthName(summary.period_label);
  const business = summary.business_name?.trim() || user?.businessName?.trim();
  const now = new Date();
  return {
    mode: 'live',
    firstName,
    letterDateLabel: `${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} · AT Letter`,
    periodIntro: `Here's your ${periodName} in plain English.`,
    broughtIn: fmtUsd(summary.total_gross),
    spent: '—',
    kept: fmtUsd(summary.net_to_bank),
    summary: `Your latest saved report for ${periodName}. Open the dashboard for full cash flow and reconciliation detail.`,
    watchTitle: 'One thing to watch',
    watchText:
      summary.difference != null && Math.abs(summary.difference) > 0.01
        ? `Reconciliation gap of ${fmtUsd(summary.difference)} — review matched payouts in your dashboard.`
        : 'No major reconciliation gaps flagged on your latest report.',
    actionTitle: 'Your next step',
    actionText: 'View the full analysis for channel breakdown, fees, and flagged transactions.',
    closingLine: 'Your numbers are saved — pick up where you left off.',
    footerMeta: [summary.period_label ?? periodName, business].filter(Boolean).join(' · ') || 'Your business',
    statementId: summary.statement_id,
    hasPdf: Boolean(summary.has_pdf),
  };
}

export function buildAtLetterPreview(
  result: AnalyzeResult | null | undefined,
  user: AuthUser | null | undefined,
  meta?: { statementId?: string; hasPdf?: boolean },
): AtLetterPreview | null {
  const analysis = result?.analysis;
  if (!hasLetterData(analysis)) return null;

  const firstName = firstNameFromUser(user);
  const periodLabel = analysis?.period_label ?? analysis?.cash_flow?.period_label ?? null;
  const periodName = periodMonthName(periodLabel);
  const cf = analysis?.cash_flow;
  const deposited = totalCashDeposited(analysis);
  const broughtIn =
    deposited != null
      ? fmtUsd(deposited)
      : cf?.money_in_usd && cf.money_in_usd !== '—'
        ? cf.money_in_usd
        : fmtUsd(cf?.money_in);
  const spent = cf?.money_out_usd && cf.money_out_usd !== '—' ? cf.money_out_usd : fmtUsd(cf?.money_out);
  let kept = '—';
  if (cf?.cash_on_hand_usd && cf.cash_on_hand_usd !== '—') {
    kept = cf.cash_on_hand_usd;
  } else if (cf?.money_in != null && cf?.money_out != null) {
    kept = fmtUsd(cf.money_in - cf.money_out);
  }

  const insights = analysis?.standard_insights ?? [];
  const watch = pickWatchInsight(insights);
  const actionFromGuidance = cf?.guidance;
  const actionInsight = pickActionInsight(insights, watch?.id);

  const revenueKpi = analysis?.kpis?.find((k) => /revenue|gross|sales/i.test(k.label));
  const summaryEmphasis = revenueKpi?.delta?.replace(/^[↑↓]\s*/, '') ?? watch?.headline;
  const summary =
    analysis?.message?.trim() ||
    revenueKpi?.comparison_note?.trim() ||
    revenueKpi?.footnote?.trim() ||
    watch?.answer ||
    analysis?.title?.trim() ||
    `Here's how ${periodName} looked from your uploaded statements.`;

  const business = analysis?.business_name?.trim() || user?.businessName?.trim();
  const footerMeta = [periodLabel ?? periodName, business].filter(Boolean).join(' · ') || 'Your business';

  const now = new Date();
  const letterDateLabel = `${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} · AT Letter`;

  return {
    mode: 'live',
    firstName,
    letterDateLabel,
    periodIntro: `Here's your ${periodName} in plain English.`,
    broughtIn,
    spent,
    kept,
    summary,
    summaryEmphasis: summaryEmphasis && summary !== summaryEmphasis ? summaryEmphasis : undefined,
    watchTitle: 'One thing to watch',
    watchText: watch?.answer || watch?.headline || 'No major risks flagged this period.',
    actionTitle: actionFromGuidance?.headline ? "This month's one action" : 'Your next step',
    actionText:
      actionFromGuidance?.answer ||
      actionInsight?.answer ||
      'Review your dashboard for channel breakdown and reconciliation details.',
    closingLine: cf?.hero_delta?.includes('↑') ? "You're on track. Keep going." : 'Review the numbers when you have a minute.',
    footerMeta,
    statementId: meta?.statementId ?? result?.statement_id ?? undefined,
    hasPdf:
      meta?.hasPdf ??
      Boolean(
        meta?.statementId ??
          result?.statement_id ??
          (result?.report?.channels?.length ?? 0) > 0,
      ),
  };
}

/** Shown when logged out but this browser previously saved a letter hint. */
export function buildLoggedOutSavedLetterPreview(): AtLetterPreview {
  return {
    mode: 'empty',
    firstName: 'there',
    letterDateLabel: 'AT Letter',
    periodIntro: 'Sign in to pick up your AT Letter.',
    broughtIn: '',
    spent: '',
    kept: '',
    summary: '',
    watchTitle: '',
    watchText: '',
    actionTitle: 'Continue',
    actionText: 'Sign in with the same account you used to upload.',
    closingLine: 'Your letter loads automatically after sign-in.',
    footerMeta: 'Sign in to continue',
  };
}

export function buildEmptyAtLetterPreview(user: AuthUser | null | undefined): AtLetterPreview {
  const firstName = firstNameFromUser(user);
  const greeting = firstName === 'there' ? 'Welcome' : `Welcome, ${firstName}`;
  return {
    mode: 'empty',
    firstName,
    letterDateLabel: 'AT Letter',
    periodIntro: `${greeting} — upload your statements to get your first AT Letter.`,
    broughtIn: '',
    spent: '',
    kept: '',
    summary: '',
    watchTitle: '',
    watchText: '',
    actionTitle: 'Get started',
    actionText: 'Upload your statements, run analyze, and your AT Letter appears here.',
    closingLine: 'We will write your first letter for you.',
    footerMeta: user?.businessName?.trim() || 'New to AskTill',
  };
}

/** Plain-text body for mailto forward of the AT Letter. */
export function atLetterMailtoBody(letter: AtLetterPreview): string {
  const lines = [
    'Hi,',
    '',
    letter.periodIntro,
    '',
    `Brought in: ${letter.broughtIn}`,
    `Spent: ${letter.spent}`,
    `Kept: ${letter.kept}`,
    '',
    letter.summaryEmphasis ? `${letter.summaryEmphasis} ${letter.summary}` : letter.summary,
    '',
    `${letter.watchTitle}: ${letter.watchText}`,
    '',
    `${letter.actionTitle}: ${letter.actionText}`,
    '',
    letter.closingLine,
    '',
    '— AskTill',
    letter.footerMeta,
  ];
  return lines.join('\n');
}

export function atLetterMailtoUrl(letter: AtLetterPreview): string {
  const subject = encodeURIComponent(`AskTill AT Letter — ${letter.footerMeta}`);
  const body = encodeURIComponent(atLetterMailtoBody(letter));
  return `mailto:?subject=${subject}&body=${body}`;
}
