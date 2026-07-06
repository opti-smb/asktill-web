/** Read POST /api/analyze like Postman — report for money, analysis for UI fields. */

export interface ChannelMetrics {
  label: string;
  role: string;
  gross_sales?: number | null;
  refunds?: number | null;
  net_sales?: number | null;
  fees?: number | null;
  net_to_bank?: number | null;
  source_file: string;
}

export interface AnalyzeReport {
  title?: string;
  total_gross?: number;
  total_refunds?: number;
  total_net_sales?: number;
  total_fees?: number;
  total_net_to_bank?: number;
  expected_bank_inflows?: number;
  actual_bank_credits?: number | null;
  difference?: number | null;
  channels?: ChannelMetrics[];
  notes?: unknown[];
  input_files?: string[];
}

export interface StandardInsight {
  id: string;
  tag: string;
  question: string;
  headline: string;
  answer: string;
  highlight_value?: string | null;
  /** e.g. "Cushion after largest payroll" — not the payroll debit amount */
  highlight_label?: string | null;
  severity?: string;
}

export interface KpiSparkBarApi {
  x: number;
  y: number;
  height: number;
  fill: string;
  label?: string | null;
  label_fill?: string | null;
}

export interface KpiCardApi {
  id: string;
  label: string;
  value: number | null;
  formatted_value: string;
  format?: string;
  footnote?: string | null;
  helper_text?: string | null;
  delta?: string | null;
  delta_type?: string | null;
  prev_label?: string | null;
  avg_label?: string | null;
  avg_note?: string | null;
  avg_note_type?: string | null;
  spark_bars?: KpiSparkBarApi[];
  comparison_note?: string | null;
}

export interface ProcessorCardApi {
  id: string;
  title: string;
  icon: string;
  subtitle: string;
  gross_processed?: number | null;
  transaction_count?: number | null;
  avg_commission_pct?: number | null;
  avg_commission_label?: string;
  net_to_bank?: number | null;
  fees?: number | null;
  refunds?: number | null;
  stat1_formatted?: string | null;
  stat2_label?: string;
  stat2_formatted?: string | null;
  stat2_range?: string | null;
}

export interface PayoutBankMatchApi {
  channel?: string;
  source_label?: string;
  report_date?: string | null;
  report_amount?: number | null;
  report_amount_usd?: string;
  bank_date?: string | null;
  bank_amount?: number | null;
  bank_amount_usd?: string;
  bank_description?: string | null;
  amount_difference?: number | null;
  amount_difference_usd?: string;
  match_reason?: string | null;
  status?: string;
}

export interface DifferenceExplanationApi {
  category?: string;
  title?: string;
  description?: string;
  amount?: number | null;
  amount_usd?: string;
  severity?: string;
}

export interface ReconciliationDeepDiveApi {
  payout_matches?: PayoutBankMatchApi[];
  difference_explanations?: DifferenceExplanationApi[];
  matched_payout_count?: number;
  pending_payout_count?: number;
  unmatched_bank_count?: number;
}

export interface ChannelDetailApi {
  gross_sales?: number | null;
  net_to_bank?: number | null;
  deposited_to_bank?: number | null;
  charges?: number | null;
}

export interface ReconciliationBreakdown {
  pos?: ChannelDetailApi | null;
  ecommerce?: ChannelDetailApi | null;
  total_expected_payouts?: number | null;
  total_expected_payouts_usd?: string;
  total_bank_credits?: number | null;
  total_bank_credits_usd?: string;
  overall_difference?: number | null;
  overall_difference_usd?: string;
  reconciliation_deep_dive?: ReconciliationDeepDiveApi | null;
}

export interface FinancialSummaryApi {
  total_gross?: number | null;
  total?: number | null;
  charges?: number | null;
  net_to_bank?: number | null;
  total_revenue?: number | null;
  total_refunds?: number | null;
  total_fees?: number | null;
  actual_bank_credits?: number | null;
  expected_bank_inflows?: number | null;
  difference?: number | null;
  ending_balance?: number | null;
  cash_sales?: number | null;
  cash_deposited?: number | null;
  processor_fees?: number | null;
  formulas?: string[];
}

export interface CashFlowBreakdownItemApi {
  label: string;
  value_usd: string;
  width: string;
  color: string;
  informational?: boolean;
}

export interface CashFlowBankDebitLineApi {
  date: string;
  description: string;
  category: string;
  amount_usd: string;
}

export interface CashFlowMonthBarApi {
  label: string;
  value_usd: string;
  amount: number;
  is_current?: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  rx: string;
  fill: string;
  text_fill: string;
}

export interface CashFlowMonthTrendApi {
  section_label: string;
  bars: CashFlowMonthBarApi[];
  avg_usd?: string | null;
  avg_label?: string | null;
  show_avg_line?: boolean;
  prior_delta?: string | null;
  prior_delta_type?: string | null;
  months_available?: number;
  note?: string | null;
}

export interface CashFlowForecastLabelApi {
  x: number;
  label: string;
  bold?: boolean;
}

export interface CashFlowForecastMarkerApi {
  x: number;
  y: number;
  label?: string;
}

export interface CashFlowForecastChartApi {
  section_label: string;
  show_chart?: boolean;
  note?: string | null;
  y_axis_labels: string[];
  grid_y: number[];
  today_x: number;
  today_label: string;
  today_y: number;
  past_area_path: string;
  past_line_path: string;
  future_area_path: string;
  future_line_path: string;
  end_forecast_usd: string;
  end_x: number;
  end_y: number;
  x_labels: CashFlowForecastLabelApi[];
  payroll_markers?: CashFlowForecastMarkerApi[];
  show_payroll_legend?: boolean;
  months_available?: number;
}

export interface CashFlowGuidanceApi {
  question: string;
  headline: string;
  answer: string;
  severity?: string;
}

export interface CashFlowUiApi {
  period_label: string;
  hero_label?: string;
  cash_on_hand?: number | null;
  cash_on_hand_usd?: string;
  hero_meta_usd?: string | null;
  hero_meta_label?: string | null;
  bank_balance?: number | null;
  bank_balance_usd?: string | null;
  money_in?: number | null;
  money_in_usd?: string;
  money_in_subtitle?: string;
  money_out?: number | null;
  money_out_usd?: string;
  money_out_subtitle?: string;
  inflows?: CashFlowBreakdownItemApi[];
  outflows?: CashFlowBreakdownItemApi[];
  bank_debit_lines?: CashFlowBankDebitLineApi[];
  net_to_bank?: number | null;
  net_to_bank_usd?: string | null;
  cash_sales?: number | null;
  cash_sales_usd?: string | null;
  cash_sales_note?: string | null;
  cash_deposited?: number | null;
  cash_deposited_usd?: string | null;
  pending_settlements?: number | null;
  pending_settlements_usd?: string | null;
  money_in_trend?: CashFlowMonthTrendApi | null;
  money_out_trend?: CashFlowMonthTrendApi | null;
  forecast_chart?: CashFlowForecastChartApi | null;
  hero_trend_footnote?: string | null;
  hero_delta?: string | null;
  hero_delta_type?: string | null;
  hero_prev_label?: string | null;
  hero_avg_label?: string | null;
  hero_avg_note?: string | null;
  hero_avg_note_type?: string | null;
  guidance?: CashFlowGuidanceApi | null;
  debits_reconciled?: boolean | null;
  money_out_note?: string | null;
  money_in_note?: string | null;
}

export interface ReconciliationTransactionApi {
  date: string;
  source: string;
  meta: string;
  status: string;
  status_label: string;
  description: string;
  amount: string;
  amount_type: string;
  action: string;
}

export interface ReconciliationHealthBarApi {
  label: string;
  matched_pct_label: string;
  matched_pct: number;
  x: number;
  y: number;
  width: number;
  height: number;
  matched_fill: string;
  pending_y: number;
  pending_height: number;
  pending_fill: string;
  flagged_y: number;
  flagged_height: number;
  flagged_fill: string;
  pct_text_y: number;
  is_current?: boolean;
}

export interface ReconciliationHealthChartApi {
  section_label: string;
  bars: ReconciliationHealthBarApi[];
  avg_pct_label?: string | null;
  avg_line_y?: number | null;
  show_avg_line?: boolean;
  months_available?: number;
  note?: string | null;
}

export interface ReconciliationUiApi {
  hero: {
    matched: number;
    total: number;
    in_flight_usd: string;
    in_flight_batches: number;
    flagged: number;
    flagged_amount_usd: string;
    cash_on_hand_usd?: string | null;
    cash_count?: number;
    matched_footnote?: string | null;
    in_flight_footnote?: string | null;
    flagged_footnote?: string | null;
  };
  big_question: {
    title: string;
    sales_side_label: string;
    pos_revenue_usd: string;
    pos_revenue_subtitle: string;
    bank_deposits_usd: string;
    bank_deposits_subtitle: string;
    deposited_label: string;
    deposited_usd: string;
    in_flight_label: string;
    in_flight_usd: string;
    refunds_usd?: string | null;
    other_adjustments_label?: string | null;
    other_adjustments_usd?: string | null;
    cash_on_hand_label?: string | null;
    cash_on_hand_usd?: string | null;
    flagged_label: string;
    flagged_usd: string;
    fees_label: string;
    fees_usd: string;
    answer_lead: string;
    answer_body: string;
    answer_bullets?: string[];
    answer_sections?: { title: string; items: string[]; ordered?: boolean }[];
    answer_gap_usd: string;
    answer_timing_usd: string;
    answer_cash_usd?: string | null;
    answer_flagged_usd: string;
    answer_fees_usd: string;
  };
  buckets: {
    matched_count: number;
    matched_pct: string;
    matched_meta: string;
    matched_bar_width: string;
    pending_usd: string;
    pending_meta: string;
    pending_bar_width: string;
    cash_count?: number;
    cash_usd?: string | null;
    cash_meta?: string | null;
    cash_bar_width?: string | null;
    flagged_count: number;
    flagged_meta: string;
    flagged_bar_width: string;
    show_trends?: boolean;
    matched_vs_label?: string | null;
    matched_prior_value?: string | null;
    matched_avg_label?: string | null;
    matched_avg_value?: string | null;
    pending_vs_label?: string | null;
    pending_prior_value?: string | null;
    pending_avg_label?: string | null;
    pending_avg_value?: string | null;
    flagged_vs_label?: string | null;
    flagged_prior_value?: string | null;
    flagged_avg_label?: string | null;
    flagged_avg_value?: string | null;
  };
  health_chart?: ReconciliationHealthChartApi | null;
  transactions: ReconciliationTransactionApi[];
  flagged_filter_count: number;
  pending_filter_count: number;
  cash_filter_count?: number;
  prior_month_count?: number;
  prior_month_total_usd?: string | null;
}

export interface WeekChannelSummaryApi {
  label: string;
  gross_sales?: number | null;
  refunds?: number | null;
  net_sales?: number | null;
  fees?: number | null;
  net_to_bank?: number | null;
  activity_count?: number;
  activity_label?: string;
}

export interface WeekReportSliceApi {
  week_number: number;
  week_title: string;
  week_key: string;
  week_label: string;
  week_start: string;
  week_end: string;
  pos?: WeekChannelSummaryApi | null;
  ecommerce?: WeekChannelSummaryApi | null;
  bank?: WeekChannelSummaryApi | null;
  total_gross?: number | null;
  total_fees?: number | null;
  total_net_to_bank?: number | null;
  bank_credits?: number | null;
  difference?: number | null;
  notes?: string[];
}

export interface WeekReportsViewApi {
  period_label?: string | null;
  period_month?: string | null;
  weeks: WeekReportSliceApi[];
  default_week_key?: string | null;
}

export interface UiAnalysisView {
  period_label?: string | null;
  title?: string;
  business_name?: string | null;
  kpis?: KpiCardApi[];
  processors?: ProcessorCardApi[];
  standard_insights?: StandardInsight[];
  channel_breakdown?: ReconciliationBreakdown | null;
  financial_summary?: FinancialSummaryApi | null;
  cash_flow?: CashFlowUiApi | null;
  reconciliation?: ReconciliationUiApi | null;
  week_reports?: WeekReportsViewApi | null;
  completeness?: string;
  message?: string | null;
  upload_continuity?: import('./uploadContinuity').UploadContinuityView | null;
}

export interface ParsedDocumentApi {
  filename: string;
  detected_role?: string;
  business_name?: string | null;
  period?: string | null;
}

export interface AnalyzeResult {
  analysis?: UiAnalysisView;
  report?: AnalyzeReport;
  documents?: ParsedDocumentApi[];
  statement_id?: string | null;
}

export const REPORT_TOTAL_FIELDS = [
  { key: 'total_gross', label: 'total_gross' },
  { key: 'total_refunds', label: 'total_refunds' },
  { key: 'total_net_sales', label: 'total_net_sales' },
  { key: 'total_fees', label: 'total_fees' },
  { key: 'total_net_to_bank', label: 'total_net_to_bank' },
  { key: 'expected_bank_inflows', label: 'expected_bank_inflows' },
  { key: 'actual_bank_credits', label: 'actual_bank_credits' },
  { key: 'difference', label: 'difference' },
] as const;

export function getAnalyzeReport(result: AnalyzeResult | null | undefined) {
  return result?.report ?? null;
}

export function getAnalyzeAnalysis(result: AnalyzeResult | null | undefined) {
  return result?.analysis ?? null;
}

export interface ReportChannelDeposits {
  pos: number | null;
  ecommerce: number | null;
  total: number | null;
}

/** Per-channel bank-matched deposits from channel_breakdown (compact / AT Letter basis). */
export function reportChannelDeposits(result: AnalyzeResult | null | undefined): ReportChannelDeposits {
  const analysis = getAnalyzeAnalysis(result);
  const cb = analysis?.channel_breakdown;
  const pos = cb?.pos?.deposited_to_bank ?? cb?.pos?.net_to_bank ?? null;
  const ecom = cb?.ecommerce?.deposited_to_bank ?? cb?.ecommerce?.net_to_bank ?? null;
  const total = Math.round(((pos ?? 0) + (ecom ?? 0)) * 100) / 100;
  return {
    pos: pos != null && pos > 0 ? pos : null,
    ecommerce: ecom != null && ecom > 0 ? ecom : null,
    total: total > 0.01 ? total : null,
  };
}

/** POS + e-commerce bank-matched deposits — same basis as AT Letter and compact report. */
export function reportMatchedDeposits(result: AnalyzeResult | null | undefined): number | null {
  const channels = reportChannelDeposits(result);
  if (channels.total != null) return channels.total;
  const report = getAnalyzeReport(result);
  const expected = report?.expected_bank_inflows;
  if (expected != null && expected > 0) return expected;
  const netBank = report?.total_net_to_bank;
  if (netBank != null && netBank > 0) return netBank;
  return null;
}

export interface ReportReconciliationTotals {
  matchedDeposits: number | null;
  posDeposited: number | null;
  ecomDeposited: number | null;
  expectedInflows: number | null;
  actualBankCredits: number | null;
  gap: number | null;
}

/** Report-level reconciliation — prefer report.*, same fields as compact export. */
export function reportReconciliationTotals(
  result: AnalyzeResult | null | undefined,
): ReportReconciliationTotals {
  const report = getAnalyzeReport(result);
  const channels = reportChannelDeposits(result);
  return {
    matchedDeposits: reportMatchedDeposits(result),
    posDeposited: channels.pos,
    ecomDeposited: channels.ecommerce,
    expectedInflows: report?.expected_bank_inflows ?? null,
    actualBankCredits: report?.actual_bank_credits ?? null,
    gap: report?.difference ?? null,
  };
}

export function matchedDepositsLabel(result: AnalyzeResult | null | undefined): string {
  return fmtMoney(reportMatchedDeposits(result));
}

export function getReportTotals(result: AnalyzeResult | null | undefined) {
  const r = getAnalyzeReport(result);
  if (!r) return null;
  return {
    title: r.title,
    total_gross: r.total_gross,
    total_refunds: r.total_refunds,
    total_net_sales: r.total_net_sales,
    total_fees: r.total_fees,
    total_net_to_bank: r.total_net_to_bank,
    expected_bank_inflows: r.expected_bank_inflows,
    actual_bank_credits: r.actual_bank_credits,
    difference: r.difference,
    channels: r.channels ?? [],
    notes: r.notes ?? [],
    input_files: r.input_files ?? [],
  };
}

export function fmtMoney(v: unknown): string {
  if (v == null || (typeof v === 'number' && Number.isNaN(v))) return '—';
  return typeof v === 'number'
    ? v.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    : String(v);
}

export function formatAskResponseForChat(data: {
  answer?: string;
  response?: string;
} | null | undefined): string {
  if (!data) return '';
  return (data.answer ?? data.response ?? '').trim();
}
