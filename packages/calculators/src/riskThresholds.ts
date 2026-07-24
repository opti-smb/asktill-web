/**
 * Asktill SMB Calculator Risk Thresholds
 * Source: Asktill_Calculator_Risk_Thresholds.xlsx — two lines → three bands.
 *
 * Higher-is-better: value < highRisk = high; value > lowRisk = low; else moderate.
 * Lower-is-better:  value > highRisk = high; value < lowRisk = low; else moderate.
 */

import type { CalculatorId } from './calculators';

export type RiskLevel = 'high' | 'moderate' | 'low';
export type RiskDirection = 'higher_better' | 'lower_better';

export type RiskThresholdSpec = {
  id: CalculatorId;
  metricLabel: string;
  direction: RiskDirection;
  /** Boundary into the high-risk zone (exclusive of moderate). */
  highRisk: number;
  /** Boundary into the low-risk zone (exclusive of moderate). */
  lowRisk: number;
  unit: string;
  format: 'number' | 'percent' | 'days' | 'ratio' | 'currency';
  highLabel: string;
  lowLabel: string;
};

export type RiskReading = {
  id: CalculatorId;
  level: RiskLevel;
  value: number;
  metricLabel: string;
  direction: RiskDirection;
  highRisk: number;
  lowRisk: number;
  unit: string;
  format: RiskThresholdSpec['format'];
  highLabel: string;
  lowLabel: string;
  levelLabel: string;
};

/** Calculators that are conversion/info tools — no independent risk band. */
export const RISK_NA_CALCULATORS: ReadonlySet<CalculatorId> = new Set([
  'pricing-margin',
  'employee-true-cost',
]);

export const RISK_THRESHOLDS: Partial<Record<CalculatorId, RiskThresholdSpec>> = {
  'cash-runway': {
    id: 'cash-runway',
    metricLabel: 'Days of runway',
    direction: 'higher_better',
    highRisk: 30,
    lowRisk: 90,
    unit: 'days',
    format: 'days',
    highLabel: '< 30 days',
    lowLabel: '> 90 days',
  },
  'break-even': {
    id: 'break-even',
    metricLabel: 'Revenue as % of break-even',
    direction: 'higher_better',
    highRisk: 100,
    lowRisk: 130,
    unit: '%',
    format: 'percent',
    highLabel: '< 100%',
    lowLabel: '> 130%',
  },
  'gross-margin': {
    id: 'gross-margin',
    metricLabel: 'Gross margin %',
    direction: 'higher_better',
    highRisk: 30,
    lowRisk: 50,
    unit: '%',
    format: 'percent',
    highLabel: '< 30%',
    lowLabel: '> 50%',
  },
  'net-margin': {
    id: 'net-margin',
    metricLabel: 'Net margin %',
    direction: 'higher_better',
    highRisk: 5,
    lowRisk: 15,
    unit: '%',
    format: 'percent',
    highLabel: '< 5%',
    lowLabel: '> 15%',
  },
  roi: {
    id: 'roi',
    metricLabel: 'ROI on spend',
    direction: 'higher_better',
    highRisk: 0,
    lowRisk: 200,
    unit: '%',
    format: 'percent',
    highLabel: '≤ 0%',
    lowLabel: '> 200%',
  },
  'processor-compare': {
    id: 'processor-compare',
    metricLabel: 'Blended effective rate',
    direction: 'lower_better',
    highRisk: 4,
    lowRisk: 3,
    unit: '%',
    format: 'percent',
    highLabel: '> 4.0%',
    lowLabel: '< 3.0%',
  },
  'mca-apr': {
    id: 'mca-apr',
    metricLabel: 'Effective APR',
    direction: 'lower_better',
    highRisk: 100,
    lowRisk: 30,
    unit: '%',
    format: 'percent',
    highLabel: '> 100%',
    lowLabel: '< 30%',
  },
  'late-payment-cost': {
    id: 'late-payment-cost',
    metricLabel: 'Days past due',
    direction: 'lower_better',
    highRisk: 90,
    lowRisk: 30,
    unit: 'days',
    format: 'days',
    highLabel: '> 90 days',
    lowLabel: '< 30 days',
  },
  'hiring-affordability': {
    id: 'hiring-affordability',
    metricLabel: 'Runway after hire',
    direction: 'higher_better',
    highRisk: 60,
    lowRisk: 120,
    unit: 'days',
    format: 'days',
    highLabel: '< 60 days',
    lowLabel: '> 120 days',
  },
  'payroll-pct-revenue': {
    id: 'payroll-pct-revenue',
    metricLabel: 'Payroll as % of revenue',
    direction: 'lower_better',
    highRisk: 25,
    lowRisk: 15,
    unit: '%',
    format: 'percent',
    highLabel: '> 25% (retail)',
    lowLabel: '< 15% (retail)',
  },
  'loan-affordability': {
    id: 'loan-affordability',
    metricLabel: 'DSCR (incl. new loan)',
    direction: 'higher_better',
    highRisk: 1.1,
    lowRisk: 1.25,
    unit: 'x',
    format: 'ratio',
    highLabel: '< 1.10x',
    lowLabel: '> 1.25x',
  },
  'sba-eligibility': {
    id: 'sba-eligibility',
    metricLabel: 'DSCR (incl. new loan)',
    direction: 'higher_better',
    highRisk: 1.1,
    lowRisk: 1.25,
    unit: 'x',
    format: 'ratio',
    highLabel: '< 1.10x',
    lowLabel: '> 1.25x',
  },
  'buy-vs-lease': {
    id: 'buy-vs-lease',
    metricLabel: 'Runway months consumed (buy)',
    direction: 'lower_better',
    highRisk: 2,
    lowRisk: 0.5,
    unit: 'mo',
    format: 'number',
    highLabel: '> 2 months',
    lowLabel: '< 0.5 month',
  },
  'inventory-turnover': {
    id: 'inventory-turnover',
    metricLabel: 'Turns per year',
    direction: 'higher_better',
    highRisk: 2,
    lowRisk: 4,
    unit: 'x/yr',
    format: 'ratio',
    highLabel: '< 2x / year',
    lowLabel: '≥ 4x / year',
  },
  /**
   * Qualitative: lowest projected month-end balance.
   * We score using min month cash vs $0 (high) and vs one month of outflows (low).
   * highRisk=0 means any projection < 0 is high; lowRisk is set at evaluate time.
   */
  'cash-flow-forecast': {
    id: 'cash-flow-forecast',
    metricLabel: 'Lowest projected month-end',
    direction: 'higher_better',
    highRisk: 0,
    lowRisk: 0, // replaced at evaluate with 1× monthly outflow
    unit: '$',
    format: 'currency',
    highLabel: 'Any month < $0',
    lowLabel: 'Above 1 mo fixed costs',
  },
  /**
   * Consecutive weeks behind target (lower better).
   * high ≥ 2 weeks behind; low = 0 weeks behind.
   */
  'weekly-cash-flow': {
    id: 'weekly-cash-flow',
    metricLabel: 'Consecutive weeks behind',
    direction: 'lower_better',
    highRisk: 2,
    lowRisk: 0,
    unit: 'weeks',
    format: 'number',
    highLabel: '≥ 2 weeks behind',
    lowLabel: '0 weeks behind',
  },
};

const LEVEL_LABEL: Record<RiskLevel, string> = {
  high: 'High risk',
  moderate: 'Moderate',
  low: 'Low risk',
};

export function riskLevelFromValue(
  value: number,
  direction: RiskDirection,
  highRisk: number,
  lowRisk: number,
): RiskLevel {
  if (!Number.isFinite(value)) return 'moderate';
  if (direction === 'higher_better') {
    if (value < highRisk) return 'high';
    if (value > lowRisk) return 'low';
    return 'moderate';
  }
  // lower_better
  if (value > highRisk) return 'high';
  if (value < lowRisk) return 'low';
  return 'moderate';
}

export function evaluateRisk(
  id: CalculatorId,
  value: number,
  overrides?: Partial<Pick<RiskThresholdSpec, 'highRisk' | 'lowRisk' | 'highLabel' | 'lowLabel'>>,
): RiskReading | null {
  if (RISK_NA_CALCULATORS.has(id)) return null;
  const base = RISK_THRESHOLDS[id];
  if (!base || !Number.isFinite(value)) return null;
  const highRisk = overrides?.highRisk ?? base.highRisk;
  const lowRisk = overrides?.lowRisk ?? base.lowRisk;
  const level = riskLevelFromValue(value, base.direction, highRisk, lowRisk);
  return {
    id,
    level,
    value,
    metricLabel: base.metricLabel,
    direction: base.direction,
    highRisk,
    lowRisk,
    unit: base.unit,
    format: base.format,
    highLabel: overrides?.highLabel ?? base.highLabel,
    lowLabel: overrides?.lowLabel ?? base.lowLabel,
    levelLabel: LEVEL_LABEL[level],
  };
}

/** Display domain for the gauge so both thresholds sit on the arc. */
export function riskGaugeDomain(reading: RiskReading): { min: number; max: number } {
  const { value, highRisk, lowRisk, direction } = reading;
  const span = Math.abs(lowRisk - highRisk) || 1;
  if (direction === 'higher_better') {
    const min = Math.min(0, highRisk - span * 0.35, value);
    const max = Math.max(lowRisk + span * 0.5, value * 1.05, highRisk + span);
    return { min, max: max === min ? min + 1 : max };
  }
  const min = Math.min(0, lowRisk - span * 0.35, value);
  const max = Math.max(highRisk + span * 0.5, value * 1.05, lowRisk + span);
  return { min, max: max === min ? min + 1 : max };
}

export function formatRiskValue(reading: RiskReading): string {
  const v = reading.value;
  switch (reading.format) {
    case 'percent':
      return `${v.toFixed(1)}%`;
    case 'days':
      return `${Math.round(v)} days`;
    case 'ratio':
      return `${v.toFixed(2)}${reading.unit.startsWith('x') ? reading.unit : ` ${reading.unit}`}`;
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(v);
    default:
      return `${v.toFixed(v >= 10 ? 1 : 2)} ${reading.unit}`.trim();
  }
}
