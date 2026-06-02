import type { KPI } from '../types';
import type { KpiCardApi, ProcessorCardApi } from './analyzeResponse';
import { fmtMoney } from './analyzeResponse';

const defaultSpark = (fill: string): KPI['sparkBars'] => [
  { x: 6, y: 14, height: 14, fill: '#CBD5E1' },
  { x: 64, y: 12, height: 16, fill: '#94A3B8' },
  { x: 122, y: 6, height: 22, fill },
];

function mapSparkBars(kpi: KpiCardApi, fallbackFill: string): KPI['sparkBars'] {
  if (kpi.spark_bars?.length) {
    return kpi.spark_bars.map((bar) => ({
      x: bar.x,
      y: bar.y,
      height: bar.height,
      fill: bar.fill,
      label: bar.label ?? undefined,
      labelFill: bar.label_fill ?? undefined,
    }));
  }
  if (kpi.comparison_note || kpi.id === 'reconciliation_gap') {
    return [];
  }
  return defaultSpark(fallbackFill);
}

export function mapApiKpisToUi(kpis: KpiCardApi[] | undefined): KPI[] {
  if (!kpis?.length) return [];
  const fills = ['#1E40AF', '#047857', '#B45309', '#64748B'];
  return kpis.map((kpi, index) => ({
    label: kpi.label,
    value: kpi.formatted_value,
    delta: kpi.delta ?? '',
    deltaType: (kpi.delta_type as KPI['deltaType']) ?? 'flat',
    prev: kpi.prev_label ?? '',
    avgLabel: kpi.avg_label ?? '',
    avgNote: kpi.comparison_note ?? kpi.avg_note ?? kpi.footnote ?? '',
    avgNoteType: (kpi.avg_note_type as KPI['avgNoteType']) ?? 'muted',
    helperText: kpi.helper_text ?? undefined,
    sparkBars: mapSparkBars(kpi, fills[index % fills.length]),
  }));
}

export function processorIconType(icon: string): 'pos' | 'ecomm' {
  return icon === 'ecommerce' || icon === 'ecomm' ? 'ecomm' : 'pos';
}

export interface ProcessorUiProps {
  iconType: 'pos' | 'ecomm';
  title: string;
  subtitle: string;
  stat1Label: string;
  stat1Value: string;
  stat1Range: string;
  stat1Delta: string;
  stat1DeltaType: string;
  stat2Label: string;
  stat2Value: string;
  stat2Range: string;
  stat2Delta: string;
  stat2DeltaType: string;
  compRows: Array<{ label: string; width: string; fill: string; value: string; valueColor?: string }>;
}

export function mapApiProcessor(proc: ProcessorCardApi): ProcessorUiProps {
  const commission =
    proc.stat1_formatted ??
    (proc.avg_commission_pct != null ? `${proc.avg_commission_pct.toFixed(2)}%` : '—');
  const gross = proc.gross_processed ?? 0;
  const net = proc.net_to_bank ?? 0;
  const netPct = gross > 0 ? Math.round((net / gross) * 100) : 0;
  return {
    iconType: processorIconType(proc.icon),
    title: proc.title,
    subtitle: proc.subtitle,
    stat1Label: proc.avg_commission_label ?? 'Avg commission',
    stat1Value: commission,
    stat1Range: gross > 0 ? `${fmtMoney(gross)} processed` : '',
    stat1Delta: '—',
    stat1DeltaType: 'flat',
    stat2Label: proc.stat2_label ?? 'Net to bank',
    stat2Value: proc.stat2_formatted ?? fmtMoney(proc.net_to_bank),
    stat2Range: proc.stat2_range ?? (proc.fees != null ? `Fees ${fmtMoney(proc.fees)}` : ''),
    stat2Delta: '—',
    stat2DeltaType: 'flat',
    compRows: [
      {
        label: proc.stat2_label ?? 'Net to bank',
        width: `${Math.max(netPct, 4)}%`,
        fill: 'var(--brand)',
        value: proc.stat2_formatted ?? fmtMoney(net),
      },
    ],
  };
}

export function mapApiProcessors(processors: ProcessorCardApi[] | undefined): ProcessorUiProps[] {
  return processors?.map(mapApiProcessor) ?? [];
}
