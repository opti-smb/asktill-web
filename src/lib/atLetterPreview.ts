import type { AuthUser } from './api';
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
  const broughtIn = cf?.money_in_usd && cf.money_in_usd !== '—' ? cf.money_in_usd : fmtUsd(cf?.money_in);
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
    statementId: meta?.statementId,
    hasPdf: meta?.hasPdf,
  };
}

export function buildEmptyAtLetterPreview(user: AuthUser | null | undefined): AtLetterPreview {
  return {
    mode: 'empty',
    firstName: firstNameFromUser(user),
    letterDateLabel: `${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} · AT Letter`,
    periodIntro: 'Your first letter appears after you upload a statement.',
    broughtIn: '—',
    spent: '—',
    kept: '—',
    summary: 'Upload your bank statement (and POS or ecommerce reports if you have them) to get a plain-English summary tailored to your business.',
    watchTitle: 'What you will get',
    watchText: 'Cash flow, risk signals, and trends in about 30 seconds — with one thing to act on.',
    actionTitle: 'Get started',
    actionText: 'Your file is analyzed in memory and never stored on our servers unless you save the report.',
    closingLine: 'We will write this letter for you.',
    footerMeta: user?.businessName?.trim() || 'Your business',
  };
}
