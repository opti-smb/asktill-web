/** Derive calculator field defaults from uploaded statement analysis only. */

import type { CalculatorId } from '@asktill/calculators';

import type { AnalyzeResult, KpiCardApi, ProcessorCardApi } from './analyzeResponse';
import { getAnalyzeAnalysis } from './analyzeResponse';

type NumMap = Record<string, string>;

export type StatementProcessorRate = {
  /** Stable form field key, e.g. rate_pos */
  key: string;
  /** Display label exactly from statement processor title */
  label: string;
  rate: string;
};

function kpiById(kpis: KpiCardApi[] | undefined, id: string): KpiCardApi | undefined {
  return kpis?.find((k) => k.id === id);
}

function money(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '';
  return String(Math.round(n * 100) / 100);
}

function pct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '';
  return String(Math.round(n * 100) / 100);
}

function parseUsd(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** Sum outflow rows whose label looks like payroll. */
function payrollFromCashFlow(
  outflows: { label: string; value_usd: string }[] | undefined,
): number | null {
  if (!outflows?.length) return null;
  let total = 0;
  let found = false;
  for (const row of outflows) {
    const label = (row.label ?? '').toLowerCase();
    if (label.includes('payroll') || label.includes('wage') || label.includes('salary')) {
      const raw = parseUsd(row.value_usd);
      if (raw != null) {
        total += Math.abs(raw);
        found = true;
      }
    }
  }
  return found ? total : null;
}

function slugKey(raw: string): string {
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return slug || 'processor';
}

/**
 * Processors present on this statement that have a fee %.
 * Labels come from statement titles (POS, E-commerce, TexPay, …) — never Square/Stripe defaults.
 */
export function statementProcessorRates(
  result: AnalyzeResult | null | undefined,
): StatementProcessorRate[] {
  const analysis = getAnalyzeAnalysis(result);
  const procs = analysis?.processors ?? [];
  const used = new Set<string>();
  const out: StatementProcessorRate[] = [];

  for (const p of procs) {
    if (p.avg_commission_pct == null || !Number.isFinite(p.avg_commission_pct)) continue;
    const label = (p.title || p.id || 'Processor').trim();
    if (!label) continue;
    let key = `rate_${slugKey(p.id || label)}`;
    let n = 2;
    while (used.has(key)) {
      key = `rate_${slugKey(p.id || label)}_${n++}`;
    }
    used.add(key);
    out.push({ key, label, rate: pct(p.avg_commission_pct) });
  }
  return out;
}

export function statementProcessorVolumeAnnual(
  result: AnalyzeResult | null | undefined,
): string {
  const analysis = getAnalyzeAnalysis(result);
  const procs = analysis?.processors ?? [];
  const volume = procs.reduce((s: number, p: ProcessorCardApi) => s + (p.gross_processed ?? 0), 0);
  return money(volume > 0 ? volume * 12 : null);
}

function burnFromStatement(
  cash: number | null,
  runwayDays: number | null,
  moneyOut: number | null,
): string {
  if (cash != null && runwayDays != null && runwayDays > 0) {
    return money((cash * (365.25 / 12)) / runwayDays);
  }
  if (moneyOut != null && moneyOut > 0) {
    return money(moneyOut);
  }
  return '';
}

/** Blended processor fee % from statement processors (or fees ÷ revenue). */
function blendedFeePct(
  procs: ProcessorCardApi[] | undefined,
  revenue: number | null,
  totalFees: number | null,
): string {
  let gross = 0;
  let feeDollars = 0;
  for (const p of procs ?? []) {
    const g = p.gross_processed;
    const rate = p.avg_commission_pct;
    if (g != null && g > 0 && rate != null && Number.isFinite(rate)) {
      gross += g;
      feeDollars += (g * rate) / 100;
    }
  }
  if (gross > 0) return pct((feeDollars / gross) * 100);
  if (revenue != null && revenue > 0 && totalFees != null && totalFees > 0) {
    return pct((totalFees / revenue) * 100);
  }
  return '';
}

/** Average ticket = Σ gross ÷ Σ transactions when both exist. */
function avgTicketFromProcessors(procs: ProcessorCardApi[] | undefined): string {
  let gross = 0;
  let txns = 0;
  for (const p of procs ?? []) {
    if (p.gross_processed != null && p.gross_processed > 0) gross += p.gross_processed;
    if (p.transaction_count != null && p.transaction_count > 0) txns += p.transaction_count;
  }
  if (gross > 0 && txns > 0) return money(gross / txns);
  return '';
}

/**
 * Contribution margin % after statement fees & refunds when COGS is unknown.
 * Not invented — only computed when revenue and fee/refund totals exist.
 */
function contributionMarginPct(
  revenue: number | null,
  fees: number | null,
  refunds: number | null,
): string {
  if (revenue == null || !(revenue > 0)) return '';
  const fee = fees != null && fees > 0 ? fees : 0;
  const ref = refunds != null && refunds > 0 ? refunds : 0;
  const cm = ((revenue - fee - ref) / revenue) * 100;
  if (!(cm > 0 && cm < 100)) return '';
  return pct(cm);
}

/**
 * Build statement-backed defaults for each statement calculator.
 * Empty string = not available from this analysis (never invent industry rates / calendar week).
 */
export function statementDefaultsFor(
  id: CalculatorId,
  result: AnalyzeResult | null | undefined,
): NumMap {
  const analysis = getAnalyzeAnalysis(result);
  if (!analysis) return {};

  const kpis = analysis.kpis;
  const revenue = kpiById(kpis, 'revenue')?.value ?? null;
  const cashKpi = kpiById(kpis, 'cash_position')?.value ?? null;
  const runwayDays = kpiById(kpis, 'days_of_runway')?.value ?? null;
  const netMarginPct = kpiById(kpis, 'net_margin')?.value ?? null;
  const cf = analysis.cash_flow;
  const fs = analysis.financial_summary;
  const cash =
    cf?.cash_on_hand ??
    cf?.bank_balance ??
    cashKpi ??
    fs?.ending_balance ??
    null;
  const moneyIn =
    cf?.money_in ??
    fs?.expected_bank_inflows ??
    fs?.total_gross ??
    null;
  const moneyOut = cf?.money_out ?? null;
  const periodRevenue = revenue ?? moneyIn;
  const totalFees = fs?.total_fees ?? fs?.processor_fees ?? null;
  const totalRefunds = fs?.total_refunds ?? null;
  const burn = burnFromStatement(cash, runwayDays, moneyOut);

  switch (id) {
    case 'cash-runway':
      return {
        cash: money(cash),
        burn,
        overdraft: '',
        loanPenalties: '',
        processingFees: '',
        taxes: '',
      };
    case 'cash-flow-forecast':
      return {
        cash: money(cash),
        inflow: money(moneyIn),
        outflow: money(moneyOut),
        interest: '',
        penalties: '',
        oneTimeFees: '',
        growth: '',
      };
    case 'weekly-cash-flow': {
      const weeks = analysis.week_reports?.weeks ?? [];
      const week = weeks.length > 0 ? String(weeks.length) : '';
      return {
        target: money(periodRevenue),
        week,
        soFar: money(periodRevenue),
        refunds: money(totalRefunds),
        chargebacks: '',
        fees: money(totalFees),
      };
    }
    case 'net-margin': {
      const rev = periodRevenue;
      let opex = moneyOut;
      if (rev != null && netMarginPct != null && (opex == null || opex === 0)) {
        opex = rev * (1 - netMarginPct / 100);
      }
      return {
        revenue: money(rev),
        cogs: '',
        opex: money(opex),
        interest: '',
        loanPenalties: '',
        processingFees: '',
      };
    }
    case 'gross-margin':
      return {
        revenue: money(periodRevenue),
        cogs: '',
        processingFees: money(totalFees),
        returns: money(totalRefunds),
        shipping: '',
        penalties: '',
      };
    case 'break-even':
      return {
        fixed: money(moneyOut) || burn,
        margin: contributionMarginPct(periodRevenue, totalFees, totalRefunds),
        processingFeePct: '',
        loanCharges: '',
        salesTax: '',
      };
    case 'processor-compare': {
      const rates = statementProcessorRates(result);
      const fields: NumMap = {
        volume: statementProcessorVolumeAnnual(result),
        gatewayMonthly: '',
        chargebacks: '',
        pci: '',
        perTxn: '',
        avgTicket: avgTicketFromProcessors(analysis.processors),
      };
      for (const r of rates) {
        fields[r.key] = r.rate;
      }
      return fields;
    }
    case 'payroll-pct-revenue': {
      const payroll = payrollFromCashFlow(cf?.outflows);
      return {
        payroll: money(payroll),
        revenue: money(periodRevenue),
        contractors: '',
        bonuses: '',
        agency: '',
      };
    }
    case 'hiring-affordability':
      return {
        cash: money(cash),
        burn,
        salary: '',
        recruiting: '',
        training: '',
        overtime: '',
        severance: '',
        contributionMargin: contributionMarginPct(periodRevenue, totalFees, totalRefunds),
      };
    case 'roi':
      // Period cash ROI: investment = money out, return = money in (statement month).
      return {
        investment: money(moneyOut),
        returnAmount: money(moneyIn),
        financingFees: '',
        taxes: '',
        penalties: '',
        monthsHeld: moneyOut != null && moneyIn != null ? '1' : '',
      };
    case 'buy-vs-lease':
      // Quote fields blank — not on statements. Cash shown for affordability context only.
      return {
        price: '',
        months: '',
        lease: '',
        cashAvailable: money(cash),
        buyTax: '',
        buyInterest: '',
        buyMaintenance: '',
        residual: '',
        leaseTax: '',
        leaseMaintenance: '',
        earlyTermination: '',
        discountRate: '',
      };
    case 'late-payment-cost':
      // Invoice AR aging isn’t on bank/POS statements — all fields manual.
      return {
        amount: '',
        daysLate: '',
        costOfCapital: '',
        lateFees: '',
        collectionFees: '',
        legalCosts: '',
      };
    case 'employee-true-cost':
      // Per-employee salary + burden % aren’t on statements (payroll total ≠ one salary).
      return {
        salary: '',
        burden: '',
        signingBonus: '',
        severance: '',
      };
    case 'loan-affordability': {
      // Free cash from statement period; loan quote fields blank.
      const freeCash =
        moneyIn != null && moneyOut != null ? money(moneyIn - moneyOut) : '';
      return {
        principal: '',
        rate: '',
        months: '',
        freeCash,
        origination: '',
        insurance: '',
        prepay: '',
      };
    }
    case 'pricing-margin':
      // Unit cost is never on statements; fee % is from processor rates / fees÷revenue.
      return {
        cost: '',
        margin: '',
        platformFee: '',
        processingFee: blendedFeePct(analysis.processors, periodRevenue, totalFees),
        tax: '',
      };
    case 'mca-apr':
      return {
        advance: '',
        factor: '',
        months: '',
        origination: '',
        latePenalties: '',
      };
    case 'sba-eligibility':
      return {
        revenue: money(periodRevenue != null && periodRevenue > 0 ? periodRevenue * 12 : null),
        years: '',
        requested: '',
        packing: '',
        guarantee: '',
        processing: '',
      };
    case 'inventory-turnover':
      return {
        cogs: '',
        inventory: '',
        carrying: '',
        carryingPct: '',
        storage: '',
        spoilage: '',
        financing: '',
      };
    default:
      return {};
  }
}
