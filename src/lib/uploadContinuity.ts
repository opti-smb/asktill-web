export interface UploadContinuityView {
  status: string;
  new_period_key: string;
  new_period_label: string;
  stored_period_keys?: string[];
  stored_period_labels?: Array<{ period_key: string; period_label: string }>;
  latest_stored_period_key?: string | null;
  missing_months?: Array<{ period_key: string; period_label: string }>;
  is_sequential?: boolean;
  already_on_file?: boolean;
  show_nudge?: boolean;
  nudge_title?: string | null;
  nudge_message?: string | null;
  rewards_opportunity_pts?: number;
  rewards_missed_pts?: number;
}

export function missingMonthSummary(continuity: UploadContinuityView | null | undefined): string {
  const rows = continuity?.missing_months ?? [];
  if (!rows.length) return '';
  return rows.map((row) => row.period_label).join(', ');
}

export function shouldShowContinuityNudge(
  continuity: UploadContinuityView | null | undefined,
): continuity is UploadContinuityView {
  return Boolean(continuity?.show_nudge && continuity.nudge_message?.trim());
}
