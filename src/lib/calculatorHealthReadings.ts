/**
 * UI-only health scoreboard readings.
 * Uses the same calc* formulas + evaluateRisk as CalculatorsPage — no formula changes.
 */

import {
  CALCULATOR_GROUPS,
  CALCULATORS,
  RISK_NA_CALCULATORS,
  calcBreakEven,
  calcBuyVsLease,
  calcCashFlowForecast,
  calcCashRunway,
  calcEmployeeTrueCost,
  calcGrossMargin,
  calcHiringImpact,
  calcInventoryTurnover,
  calcLatePaymentCost,
  calcLoanPayment,
  calcMcaApr,
  calcNetMargin,
  calcPayrollPct,
  calcProcessorFees,
  calcRoi,
  calcSbaEstimate,
  calcTargetPrice,
  calcWeeklyTracker,
  evaluateRisk,
  formatRiskValue,
  fmtMoney,
  fmtPct,
  getCalculator,
  optN,
  type CalculatorId,
  type CalculatorMeta,
  type RiskLevel,
  type RiskReading,
} from '@asktill/calculators';

import type { AnalyzeResult } from './analyzeResponse';
import { getAnalyzeAnalysis } from './analyzeResponse';
import { mergeDefaults, type NumMap } from '../hooks/useCalculatorForm';
import { statementDefaultsFor, statementProcessorRates } from './statementCalculatorInputs';

export type HealthBand = 'red' | 'amber' | 'green' | 'na';

export type CalculatorHealthRow = {
  id: CalculatorId;
  meta: CalculatorMeta;
  band: HealthBand;
  pillLabel: string;
  metricLabel: string;
  displayMain: string;
  displayUnit: string;
  risk: RiskReading | null;
  note?: string;
};

export type CalculatorHealthOverview = {
  score: number;
  band: HealthBand;
  bandLabel: string;
  healthy: number;
  watch: number;
  atRisk: number;
  scored: number;
  total: number;
  periodLabel: string;
  summary: string;
  groups: { id: string; title: string; rows: CalculatorHealthRow[] }[];
};

function num(v: NumMap, key: string): number {
  return Number(v[key]);
}

function o(v: NumMap, key: string): number {
  return optN(v[key]);
}

function bandFromRisk(level: RiskLevel | null | undefined): HealthBand {
  if (level === 'high') return 'red';
  if (level === 'moderate') return 'amber';
  if (level === 'low') return 'green';
  return 'na';
}

function pillFor(band: HealthBand): string {
  if (band === 'red') return 'At risk';
  if (band === 'amber') return 'Watch';
  if (band === 'green') return 'Healthy';
  return 'Info';
}

function scoredRow(
  id: CalculatorId,
  meta: CalculatorMeta,
  risk: RiskReading | null,
  displayMain: string,
  displayUnit = '',
  metricLabel?: string,
): CalculatorHealthRow {
  const band = bandFromRisk(risk?.level);
  return {
    id,
    meta,
    band,
    pillLabel: pillFor(band),
    metricLabel: metricLabel ?? risk?.metricLabel ?? meta.name,
    displayMain,
    displayUnit,
    risk,
  };
}

function infoRow(
  id: CalculatorId,
  meta: CalculatorMeta,
  displayMain: string,
  note: string,
  metricLabel?: string,
): CalculatorHealthRow {
  return {
    id,
    meta,
    band: 'na',
    pillLabel: RISK_NA_CALCULATORS.has(id) ? 'Info' : 'n/a',
    metricLabel: metricLabel ?? meta.name,
    displayMain,
    displayUnit: '',
    risk: null,
    note,
  };
}

function readingFor(
  id: CalculatorId,
  result: AnalyzeResult | null | undefined,
): CalculatorHealthRow {
  const meta = getCalculator(id)!;
  const v = mergeDefaults(id, statementDefaultsFor(id, result));
  const analysis = getAnalyzeAnalysis(result);

  switch (id) {
    case 'cash-runway': {
      const out = calcCashRunway(num(v, 'cash'), num(v, 'burn'), {
        overdraftFees: o(v, 'overdraft'),
        loanPenalties: o(v, 'loanPenalties'),
        processingFees: o(v, 'processingFees'),
        taxes: o(v, 'taxes'),
      });
      if (!out) {
        return infoRow(id, meta, '—', 'Need cash and monthly burn from statements.', 'Days of runway');
      }
      return scoredRow(id, meta, evaluateRisk(id, out.days), String(Math.round(out.days)), 'days');
    }
    case 'cash-flow-forecast': {
      const out = calcCashFlowForecast(num(v, 'cash'), num(v, 'inflow'), num(v, 'outflow'), {
        interestIncome: o(v, 'interest'),
        penalties: o(v, 'penalties'),
        oneTimeFeesMonthly: o(v, 'oneTimeFees'),
        monthlyGrowthPct: o(v, 'growth'),
      });
      if (!out) {
        return infoRow(id, meta, '—', 'Need cash, money in, and money out from statements.');
      }
      const lowest = Math.min(...out.months.map((m) => m.cash));
      const oneMonthFixed = Math.max(out.effectiveOut, 0);
      const risk = evaluateRisk(id, lowest, {
        highRisk: 0,
        lowRisk: oneMonthFixed,
        highLabel: 'Any month < $0',
        lowLabel: `Above ${fmtMoney(oneMonthFixed)} (1 mo outflows)`,
      });
      return scoredRow(id, meta, risk, fmtMoney(lowest), '', 'Lowest projected balance');
    }
    case 'weekly-cash-flow': {
      const out = calcWeeklyTracker(num(v, 'target'), num(v, 'week'), num(v, 'soFar'), {
        refunds: o(v, 'refunds'),
        chargebacks: o(v, 'chargebacks'),
        fees: o(v, 'fees'),
      });
      if (!out) {
        return infoRow(id, meta, '—', 'Need monthly revenue and week progress from statements.');
      }
      const weeksBehind = out.onTrack ? 0 : 1;
      return scoredRow(
        id,
        meta,
        evaluateRisk(id, weeksBehind),
        out.onTrack ? 'On target' : '1',
        out.onTrack ? '' : 'wk behind',
      );
    }
    case 'break-even': {
      const out = calcBreakEven(num(v, 'fixed'), num(v, 'margin'), {
        processingFeePct: o(v, 'processingFeePct'),
        loanCharges: o(v, 'loanCharges'),
        salesTaxAbsorbedPct: o(v, 'salesTax'),
      });
      if (!out) {
        return infoRow(id, meta, '—', 'Need fixed costs and contribution margin from statements.');
      }
      const stmtRevenue =
        analysis?.kpis?.find((k) => k.id === 'revenue')?.value ??
        analysis?.cash_flow?.money_in ??
        analysis?.financial_summary?.total_gross ??
        null;
      const revenuePctOfBe =
        out.monthlyRevenue > 0 && stmtRevenue != null && stmtRevenue > 0
          ? (stmtRevenue / out.monthlyRevenue) * 100
          : null;
      if (revenuePctOfBe == null) {
        return infoRow(
          id,
          meta,
          fmtMoney(out.monthlyRevenue),
          'Break-even computed; revenue % vs break-even needs statement revenue.',
          'Break-even monthly sales',
        );
      }
      return scoredRow(
        id,
        meta,
        evaluateRisk(id, revenuePctOfBe),
        `${revenuePctOfBe.toFixed(0)}%`,
        '',
        'Revenue vs break-even',
      );
    }
    case 'gross-margin': {
      const out = calcGrossMargin(num(v, 'revenue'), o(v, 'cogs'), {
        processingFees: o(v, 'processingFees'),
        returns: o(v, 'returns'),
        shipping: o(v, 'shipping'),
        penalties: o(v, 'penalties'),
      });
      if (!out) {
        return infoRow(id, meta, '—', 'Need statement revenue.');
      }
      return scoredRow(id, meta, evaluateRisk(id, out.marginPct), fmtPct(out.marginPct));
    }
    case 'pricing-margin': {
      const out = calcTargetPrice(num(v, 'cost'), num(v, 'margin'), {
        platformFeePct: o(v, 'platformFee'),
        processingFeePct: o(v, 'processingFee'),
        taxPct: o(v, 'tax'),
      });
      if (!out) {
        return infoRow(
          id,
          meta,
          '—',
          'Informational — enter cost and target margin to convert markup.',
          'Markup → margin',
        );
      }
      return infoRow(
        id,
        meta,
        fmtMoney(out.price),
        'Informational tool — no independent risk band.',
        'Target price',
      );
    }
    case 'net-margin': {
      const out = calcNetMargin(num(v, 'revenue'), o(v, 'cogs'), num(v, 'opex'), {
        interest: o(v, 'interest'),
        loanPenalties: o(v, 'loanPenalties'),
        processingFees: o(v, 'processingFees'),
      });
      if (!out) {
        return infoRow(id, meta, '—', 'Need revenue and expenses from statements.');
      }
      return scoredRow(id, meta, evaluateRisk(id, out.netMarginPct), fmtPct(out.netMarginPct));
    }
    case 'roi': {
      const out = calcRoi(num(v, 'investment'), num(v, 'returnAmount'), {
        financingFees: o(v, 'financingFees'),
        taxesOnGain: o(v, 'taxes'),
        penalties: o(v, 'penalties'),
        monthsHeld: o(v, 'monthsHeld'),
      });
      if (!out) {
        return infoRow(id, meta, '—', 'Need money out and money in from statements.');
      }
      return scoredRow(id, meta, evaluateRisk(id, out.roiPct), fmtPct(out.roiPct));
    }
    case 'processor-compare': {
      const stmtRates = statementProcessorRates(result);
      const rateRows = stmtRates
        .map((r) => ({ name: r.label, ratePct: num(v, r.key), raw: v[r.key] ?? '' }))
        .filter((r) => r.raw !== '' && Number.isFinite(r.ratePct) && r.ratePct >= 0);
      if (!rateRows.length) {
        return infoRow(id, meta, '—', 'No processor fee % on this statement.');
      }
      const out = calcProcessorFees(
        num(v, 'volume'),
        rateRows.map(({ name, ratePct }) => ({ name, ratePct })),
        {
          monthlyGatewayFee: o(v, 'gatewayMonthly'),
          chargebackFeesAnnual: o(v, 'chargebacks'),
          pciFeesAnnual: o(v, 'pci'),
          perTxnFee: o(v, 'perTxn'),
          avgTicket: o(v, 'avgTicket'),
        },
      );
      if (!out) {
        return infoRow(id, meta, '—', 'Need card volume from statements.');
      }
      const blended = rateRows.reduce((s, r) => s + r.ratePct, 0) / rateRows.length;
      return scoredRow(id, meta, evaluateRisk(id, blended), `${blended.toFixed(2)}%`);
    }
    case 'mca-apr': {
      const out = calcMcaApr(num(v, 'advance'), num(v, 'factor'), num(v, 'months'), {
        originationFee: o(v, 'origination'),
        latePenalties: o(v, 'latePenalties'),
      });
      if (!out) {
        return infoRow(
          id,
          meta,
          'None',
          'No merchant cash advance on file this period — nothing to flag.',
          'Effective APR',
        );
      }
      return scoredRow(id, meta, evaluateRisk(id, out.aprPct), `${out.aprPct.toFixed(0)}%`, 'APR');
    }
    case 'late-payment-cost': {
      if (!(num(v, 'daysLate') >= 0) || v.daysLate === '') {
        return infoRow(id, meta, '—', 'No AR aging days on this statement.');
      }
      const out = calcLatePaymentCost(num(v, 'amount'), num(v, 'daysLate'), o(v, 'costOfCapital'), {
        lateFees: o(v, 'lateFees'),
        collectionFees: o(v, 'collectionFees'),
        legalCosts: o(v, 'legalCosts'),
      });
      if (!out) {
        return infoRow(id, meta, '—', 'Need amount owed and days late.');
      }
      return scoredRow(
        id,
        meta,
        evaluateRisk(id, num(v, 'daysLate')),
        String(Math.round(num(v, 'daysLate'))),
        'days',
      );
    }
    case 'hiring-affordability': {
      if (!v.salary || !(num(v, 'salary') > 0)) {
        return infoRow(
          id,
          meta,
          '—',
          'Enter a hire salary to score runway impact (cash/burn prefill from statements).',
          'Runway after hire',
        );
      }
      const out = calcHiringImpact(num(v, 'cash'), num(v, 'burn'), num(v, 'salary'), {
        recruitingFees: o(v, 'recruiting'),
        trainingMonthly: o(v, 'training'),
        overtimeMonthly: o(v, 'overtime'),
        severanceMonthly: o(v, 'severance'),
        contributionMarginPct: o(v, 'contributionMargin'),
      });
      if (!out) {
        return infoRow(id, meta, '—', 'Need statement cash, burn, and hire salary.');
      }
      return scoredRow(
        id,
        meta,
        evaluateRisk(id, out.runwayAfterDays),
        String(Math.round(out.runwayAfterDays)),
        'days',
      );
    }
    case 'employee-true-cost': {
      const out = calcEmployeeTrueCost(num(v, 'salary'), num(v, 'burden'), {
        signingBonus: o(v, 'signingBonus'),
        severance: o(v, 'severance'),
      });
      if (!out) {
        return infoRow(
          id,
          meta,
          '—',
          'Informational — enter salary and burden % to see all-in cost.',
          'All-in annual cost',
        );
      }
      return infoRow(
        id,
        meta,
        fmtMoney(out.allIn),
        'Informational tool — no independent risk band.',
        'All-in annual cost',
      );
    }
    case 'payroll-pct-revenue': {
      const out = calcPayrollPct(num(v, 'payroll'), num(v, 'revenue'), {
        contractors: o(v, 'contractors'),
        bonuses: o(v, 'bonuses'),
        agencyMarkups: o(v, 'agency'),
      });
      if (!out) {
        return infoRow(id, meta, '—', 'Need payroll and revenue from statements.');
      }
      return scoredRow(id, meta, evaluateRisk(id, out.pct), fmtPct(out.pct));
    }
    case 'loan-affordability': {
      if (!v.principal || !v.rate || !v.months || v.freeCash === undefined || v.freeCash === '') {
        return infoRow(
          id,
          meta,
          '—',
          'Enter loan terms to score DSCR (free cash may prefill from statements).',
          'DSCR',
        );
      }
      const out = calcLoanPayment(
        num(v, 'principal'),
        num(v, 'rate'),
        num(v, 'months'),
        num(v, 'freeCash'),
        {
          originationFee: o(v, 'origination'),
          monthlyInsurance: o(v, 'insurance'),
          prepaymentPenalty: o(v, 'prepay'),
        },
      );
      if (!out) {
        return infoRow(id, meta, '—', 'Need principal, rate, term, and free cash.');
      }
      const dscr =
        out.monthlyAllIn > 0 && Number.isFinite(num(v, 'freeCash'))
          ? num(v, 'freeCash') / out.monthlyAllIn
          : null;
      if (dscr == null) {
        return infoRow(id, meta, fmtMoney(out.monthlyAllIn) + '/mo', 'Open for payment details.');
      }
      return scoredRow(id, meta, evaluateRisk(id, dscr), `${dscr.toFixed(2)}×`, 'DSCR');
    }
    case 'sba-eligibility': {
      const out = calcSbaEstimate(num(v, 'revenue'), num(v, 'years'), num(v, 'requested'), {
        packingFees: o(v, 'packing'),
        guaranteeFees: o(v, 'guarantee'),
        processingCharges: o(v, 'processing'),
      });
      if (!out) {
        return infoRow(
          id,
          meta,
          '—',
          'Enter years in business and requested amount (revenue may prefill).',
          'SBA planning hint',
        );
      }
      // Same DSCR risk band as loans when free cash + requested terms exist on the form.
      const loan = calcLoanPayment(
        num(v, 'requested'),
        num(v, 'rate'),
        num(v, 'months'),
        num(v, 'freeCash'),
      );
      const dscr =
        loan && loan.monthlyAllIn > 0 && Number.isFinite(num(v, 'freeCash'))
          ? num(v, 'freeCash') / loan.monthlyAllIn
          : null;
      if (dscr != null) {
        return scoredRow(id, meta, evaluateRisk(id, dscr), `${dscr.toFixed(2)}×`, 'DSCR');
      }
      return infoRow(
        id,
        meta,
        out.likelyEligible ? 'Likely eligible' : 'May be limited',
        out.note,
        'SBA planning hint',
      );
    }
    case 'buy-vs-lease': {
      if (!v.price || !v.months || !v.lease) {
        return infoRow(
          id,
          meta,
          '—',
          'Enter equipment quote (price, term, lease) — not on bank statements.',
          'Reserve consumed',
        );
      }
      const out = calcBuyVsLease(num(v, 'price'), num(v, 'months'), num(v, 'lease'), {
        buyTax: o(v, 'buyTax'),
        buyInterest: o(v, 'buyInterest'),
        buyMaintenance: o(v, 'buyMaintenance'),
        residualValue: o(v, 'residual'),
        leaseTax: o(v, 'leaseTax'),
        leaseMaintenance: o(v, 'leaseMaintenance'),
        earlyTerminationPenalty: o(v, 'earlyTermination'),
        discountRatePct: o(v, 'discountRate'),
      });
      if (!out) {
        return infoRow(id, meta, '—', 'Need a complete equipment quote.');
      }
      // Same runway-months math as CalculatorsPage result block.
      const cashAvail = o(v, 'cashAvailable');
      const runwayKpi = analysis?.kpis?.find((k) => k.id === 'days_of_runway')?.value;
      const daysPerMonth = 365.25 / 12;
      const burnMo =
        cashAvail > 0 && runwayKpi != null && runwayKpi > 0
          ? (cashAvail * daysPerMonth) / runwayKpi
          : 0;
      const buyPrice = out.buyBreakdown.price;
      const monthsConsumed =
        burnMo > 0 && buyPrice > 0 ? buyPrice / burnMo : null;
      if (monthsConsumed == null) {
        const label =
          out.cheaper === 'same'
            ? 'Same cost'
            : out.cheaper === 'buy'
              ? 'Buy cheaper'
              : 'Lease cheaper';
        return infoRow(id, meta, label, 'Open for full buy vs lease comparison.');
      }
      return scoredRow(
        id,
        meta,
        evaluateRisk(id, monthsConsumed),
        monthsConsumed.toFixed(1),
        'mo of runway',
      );
    }
    case 'inventory-turnover': {
      const out = calcInventoryTurnover(num(v, 'cogs'), num(v, 'inventory'), {
        carryingCost: o(v, 'carrying'),
        carryingCostPct: o(v, 'carryingPct'),
        storageFees: o(v, 'storage'),
        spoilage: o(v, 'spoilage'),
        financingCharges: o(v, 'financing'),
      });
      if (!out) {
        return infoRow(id, meta, '—', 'Need COGS and inventory (often manual).');
      }
      return scoredRow(
        id,
        meta,
        evaluateRisk(id, out.turns),
        `${out.turns.toFixed(1)}×`,
        'per year',
      );
    }
    default:
      return infoRow(id, meta, '—', 'Open this calculator for details.');
  }
}

export function buildCalculatorHealthOverview(
  result: AnalyzeResult | null | undefined,
): CalculatorHealthOverview | null {
  const analysis = getAnalyzeAnalysis(result);
  if (!analysis) return null;

  const groups = CALCULATOR_GROUPS.map((g) => ({
    id: g.id,
    title: g.title,
    rows: g.calculatorIds.map((id) => readingFor(id, result)),
  }));

  const allRows = groups.flatMap((g) => g.rows);
  let healthy = 0;
  let watch = 0;
  let atRisk = 0;
  let sum = 0;
  let scored = 0;
  for (const row of allRows) {
    if (row.band === 'na') continue;
    scored += 1;
    if (row.band === 'green') {
      healthy += 1;
      sum += 100;
    } else if (row.band === 'amber') {
      watch += 1;
      sum += 60;
    } else {
      atRisk += 1;
      sum += 20;
    }
  }
  const score = scored > 0 ? Math.round(sum / scored) : 0;
  const band: HealthBand = score >= 80 ? 'green' : score >= 58 ? 'amber' : scored > 0 ? 'red' : 'na';
  const bandLabel =
    band === 'green'
      ? 'Healthy'
      : band === 'amber'
        ? 'Stable — watch items'
        : band === 'red'
          ? 'Needs attention'
          : 'Not enough data';

  const summaryParts: string[] = [];
  if (atRisk > 0) summaryParts.push(`${atRisk} at risk`);
  if (watch > 0) summaryParts.push(`${watch} to watch`);
  if (healthy > 0) summaryParts.push(`${healthy} healthy`);
  const summary =
    scored === 0
      ? 'Open a calculator or upload richer statements so we can score more readings.'
      : atRisk > 0
        ? `Start with the red cards — ${summaryParts.join(', ')}. Click any row to adjust inputs.`
        : `Looking solid overall — ${summaryParts.join(', ')}. Click any row to dig in.`;

  return {
    score,
    band,
    bandLabel,
    healthy,
    watch,
    atRisk,
    scored,
    total: CALCULATORS.length,
    periodLabel: analysis.period_label ?? 'This period',
    summary,
    groups,
  };
}

export function formatHealthRiskCaption(risk: RiskReading): string {
  return formatRiskValue(risk);
}
