export interface KPI {
  label: string;
  value: string;
  delta: string;
  deltaType: 'up' | 'down' | 'flat';
  prev: string;
  avgLabel: string;
  avgNote: string;
  avgNoteType: 'pos' | 'neg' | 'muted';
  sparkBars: SparkBar[];
}

export interface SparkBar {
  x: number;
  y: number;
  height: number;
  fill: string;
  label?: string;
  labelFill?: string;
}

export interface Question {
  id: string;
  text: string;
  answer: string;
}

export interface PickerQuestion {
  id: string;
  text: string;
  hasExpandedContent: boolean;
}

export interface UpcomingItem {
  day: string;
  month: string;
  title: string;
  sub: string;
  amount: string;
  type: 'in' | 'out';
}

export interface InflowCategory {
  label: string;
  width: string;
  color: string;
  value: string;
}

export interface OutflowCategory {
  label: string;
  width: string;
  color: string;
  value: string;
  opacity?: number;
}

export interface MonthBar {
  label: string;
  value: string;
  height: number;
  y: number;
  rx: string;
  fill: string;
  textFill: string;
  x: number;
}

export interface ReconTransaction {
  date: string;
  source: string;
  meta: string;
  status: 'flagged' | 'pending';
  statusLabel: string;
  description: string;
  amount: string;
  amountType: 'neg' | 'warn';
  action: string;
}

export interface LandingStat {
  num: string;
  label: string;
  sublabel: string;
}

export type Period = 'Week' | 'Month' | 'Quarter';

export interface FileUploadState {
  uploaded: boolean;
  fileName?: string;
  detail?: string;
  warning?: string;
  checking?: boolean;
}
