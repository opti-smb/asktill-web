/** Pure input-based SMB calculators — real-world / textbook formulas (not AT Letter). */

export type CalculatorId =
  | 'cash-runway'
  | 'cash-flow-forecast'
  | 'weekly-cash-flow'
  | 'break-even'
  | 'gross-margin'
  | 'pricing-margin'
  | 'net-margin'
  | 'roi'
  | 'processor-compare'
  | 'mca-apr'
  | 'late-payment-cost'
  | 'hiring-affordability'
  | 'employee-true-cost'
  | 'payroll-pct-revenue'
  | 'loan-affordability'
  | 'sba-eligibility'
  | 'buy-vs-lease'
  | 'inventory-turnover';

export type CalculatorMeta = {
  id: CalculatorId;
  name: string;
  question: string;
  category: string;
};

export type CalculatorGroup = {
  id: string;
  title: string;
  calculatorIds: CalculatorId[];
};

/** Average days in a month (365.25 / 12) — used for runway & pacing. */
export const DAYS_PER_MONTH = 365.25 / 12;
export const DAYS_PER_YEAR = 365;
export const WEEKS_PER_YEAR = 52;

/**
 * All 18 Asktill Calculator Guide tools.
 * Statement-backed ones prefill from analysis; quote/manual tools take user inputs.
 */
export const CALCULATORS: CalculatorMeta[] = [
  {
    id: 'cash-runway',
    name: 'Cash Runway',
    question: 'How many days can I keep running if no new money comes in?',
    category: 'Cash flow',
  },
  {
    id: 'cash-flow-forecast',
    name: '12-Month Cash Flow Forecast',
    question: 'Based on recent months, what will my cash look like ahead?',
    category: 'Cash flow',
  },
  {
    id: 'break-even',
    name: 'Break-Even Revenue',
    question: 'How much monthly sales do I need to cover my fixed costs?',
    category: 'Margins',
  },
  {
    id: 'weekly-cash-flow',
    name: 'Weekly Cash Flow Tracker',
    question: 'Am I on track this week, or falling behind my monthly target?',
    category: 'Cash flow',
  },
  {
    id: 'gross-margin',
    name: 'Gross Margin',
    question: 'After COGS (and statement fees/returns), what margin do I keep on sales?',
    category: 'Margins',
  },
  {
    id: 'pricing-margin',
    name: 'Pricing / Markup vs Margin',
    question: 'What price do I need for my target margin after fees?',
    category: 'Margins',
  },
  {
    id: 'net-margin',
    name: 'Net Margin',
    question: 'After every expense, how much profit do I keep per dollar sold?',
    category: 'Margins',
  },
  {
    id: 'roi',
    name: 'ROI (Period Cash)',
    question: 'On the cash I spent this period, what return did money-in give me?',
    category: 'Margins',
  },
  {
    id: 'processor-compare',
    name: 'Payment Processor Compare',
    question: 'At my statement fee rates, what would each processor cost me in a year on the same sales?',
    category: 'Payments',
  },
  {
    id: 'mca-apr',
    name: 'MCA True Cost (APR)',
    question: 'My MCA has a factor rate — what is the real annual interest rate?',
    category: 'Payments',
  },
  {
    id: 'late-payment-cost',
    name: 'Late Payment Cost',
    question: 'What does an overdue invoice really cost me in time-value and fees?',
    category: 'Payments',
  },
  {
    id: 'hiring-affordability',
    name: 'Hiring Affordability',
    question: 'If I hire someone, how does that change my cash runway?',
    category: 'Hiring',
  },
  {
    id: 'employee-true-cost',
    name: 'Employee True Cost',
    question: 'What is the fully loaded cost of this employee beyond base salary?',
    category: 'Hiring',
  },
  {
    id: 'payroll-pct-revenue',
    name: 'Payroll as % of Revenue',
    question: 'Is my payroll eating too much of my revenue?',
    category: 'Hiring',
  },
  {
    id: 'loan-affordability',
    name: 'Loan Repayment & Affordability',
    question: 'Can my statement free cash cover this loan’s monthly payment?',
    category: 'Loans',
  },
  {
    id: 'sba-eligibility',
    name: 'SBA Loan Eligibility',
    question: 'Am I in the ballpark for an SBA 7(a) size request?',
    category: 'Loans',
  },
  {
    id: 'buy-vs-lease',
    name: 'Buy vs Lease',
    question: 'For this equipment quote, is buying or leasing cheaper over the term?',
    category: 'Equipment',
  },
  {
    id: 'inventory-turnover',
    name: 'Inventory Turnover',
    question: 'How fast am I turning inventory, and what’s the holding cost?',
    category: 'Inventory',
  },
];

/**
 * Accordion headings on the Calculators page.
 * Calculators stay hidden until the user opens a heading.
 */
export const CALCULATOR_GROUPS: CalculatorGroup[] = [
  {
    id: 'cash-flow-survival',
    title: 'Cash flow & survival',
    calculatorIds: ['cash-runway', 'cash-flow-forecast', 'break-even', 'weekly-cash-flow'],
  },
  {
    id: 'margins-pricing',
    title: 'Margins & pricing',
    calculatorIds: ['gross-margin', 'pricing-margin', 'net-margin', 'roi'],
  },
  {
    id: 'payments-fees',
    title: 'Payments & fees',
    calculatorIds: ['processor-compare', 'mca-apr', 'late-payment-cost'],
  },
  {
    id: 'hiring-payroll',
    title: 'Hiring & payroll',
    calculatorIds: ['hiring-affordability', 'employee-true-cost', 'payroll-pct-revenue'],
  },
  {
    id: 'loans-equipment',
    title: 'Loans & equipment',
    calculatorIds: ['loan-affordability', 'sba-eligibility', 'buy-vs-lease'],
  },
  {
    id: 'inventory',
    title: 'Inventory',
    calculatorIds: ['inventory-turnover'],
  },
];

export function getCalculator(id: string | undefined): CalculatorMeta | undefined {
  return CALCULATORS.find((c) => c.id === id);
}

export function getCalculatorGroupFor(id: CalculatorId | string | undefined): CalculatorGroup | undefined {
  if (!id) return undefined;
  return CALCULATOR_GROUPS.find((g) => g.calculatorIds.includes(id as CalculatorId));
}

export function calculatorsInGroup(group: CalculatorGroup): CalculatorMeta[] {
  return group.calculatorIds
    .map((id) => getCalculator(id))
    .filter((c): c is CalculatorMeta => c != null);
}

function n(value: string | number): number {
  const x = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  return Number.isFinite(x) ? x : NaN;
}

/** Treat blank / missing optional inputs as 0. */
export function optN(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0;
  const x = n(value as string | number);
  return Number.isFinite(x) && x >= 0 ? x : 0;
}

/** Present value of an ordinary annuity (monthly payments). */
function pvAnnuity(payment: number, monthlyRate: number, periods: number): number {
  if (periods <= 0) return 0;
  if (Math.abs(monthlyRate) < 1e-12) return payment * periods;
  return (payment * (1 - Math.pow(1 + monthlyRate, -periods))) / monthlyRate;
}

/**
 * Cash runway (days) = cash ÷ daily burn.
 * Daily burn = monthly burn ÷ (365.25/12). Standard SMB cash-management formula.
 */
export function calcCashRunway(
  cashBalance: number,
  monthlyBurn: number,
  extras: {
    overdraftFees?: number;
    loanPenalties?: number;
    processingFees?: number;
    taxes?: number;
  } = {},
): {
  days: number;
  months: number;
  effectiveBurn: number;
  extraBurn: number;
  dailyBurn: number;
} | null {
  const cash = n(cashBalance);
  const burn = n(monthlyBurn);
  if (!(cash >= 0) || !(burn > 0)) return null;
  const extraBurn =
    optN(extras.overdraftFees) +
    optN(extras.loanPenalties) +
    optN(extras.processingFees) +
    optN(extras.taxes);
  const effectiveBurn = burn + extraBurn;
  const dailyBurn = effectiveBurn / DAYS_PER_MONTH;
  const days = cash / dailyBurn;
  const months = cash / effectiveBurn;
  return { days, months, effectiveBurn, extraBurn, dailyBurn };
}

/**
 * 12-month cash projection with optional constant monthly growth on net cash flow.
 * cash_t = cash_{t-1} + net × (1+g)^(t-1)
 */
export function calcCashFlowForecast(
  startingCash: number,
  avgMonthlyIn: number,
  avgMonthlyOut: number,
  extras: {
    interestIncome?: number;
    penalties?: number;
    oneTimeFeesMonthly?: number;
    /** Optional monthly growth rate on net cash flow (%), e.g. 1 = +1%/mo. */
    monthlyGrowthPct?: number;
  } = {},
): {
  months: { month: number; cash: number }[];
  endingCash: number;
  effectiveIn: number;
  effectiveOut: number;
  growthPct: number;
} | null {
  const start = n(startingCash);
  const inflow = n(avgMonthlyIn);
  const outflow = n(avgMonthlyOut);
  if (!(start >= 0) || !Number.isFinite(inflow) || !Number.isFinite(outflow)) return null;
  const effectiveIn = inflow + optN(extras.interestIncome);
  const effectiveOut = outflow + optN(extras.penalties) + optN(extras.oneTimeFeesMonthly);
  const baseNet = effectiveIn - effectiveOut;
  const g = optN(extras.monthlyGrowthPct) / 100;
  const months: { month: number; cash: number }[] = [];
  let cash = start;
  for (let m = 1; m <= 12; m += 1) {
    const net = baseNet * Math.pow(1 + g, m - 1);
    cash += net;
    months.push({ month: m, cash });
  }
  return {
    months,
    endingCash: cash,
    effectiveIn,
    effectiveOut,
    growthPct: optN(extras.monthlyGrowthPct),
  };
}

/**
 * Break-even sales = Fixed costs ÷ Contribution margin ratio.
 * CM ratio = gross margin % − variable fee % (processing, absorbed sales tax).
 * Weekly = monthly × 12/52; daily = monthly × 12/365.
 */
export function calcBreakEven(
  fixedCosts: number,
  grossMarginPct: number,
  extras: {
    processingFeePct?: number;
    loanCharges?: number;
    salesTaxAbsorbedPct?: number;
  } = {},
): {
  monthlyRevenue: number;
  weeklyRevenue: number;
  dailyRevenue: number;
  effectiveFixed: number;
  effectiveMarginPct: number;
} | null {
  const fixed = n(fixedCosts);
  const margin = n(grossMarginPct);
  if (!(fixed >= 0) || !(margin > 0 && margin < 100)) return null;
  const effectiveFixed = fixed + optN(extras.loanCharges);
  const feeDrag = optN(extras.processingFeePct) + optN(extras.salesTaxAbsorbedPct);
  const effectiveMarginPct = margin - feeDrag;
  if (!(effectiveMarginPct > 0 && effectiveMarginPct < 100)) return null;
  const monthlyRevenue = effectiveFixed / (effectiveMarginPct / 100);
  return {
    monthlyRevenue,
    weeklyRevenue: (monthlyRevenue * 12) / WEEKS_PER_YEAR,
    dailyRevenue: (monthlyRevenue * 12) / DAYS_PER_YEAR,
    effectiveFixed,
    effectiveMarginPct,
  };
}

/**
 * Pace check: expected sales by end of week W ≈ target × (W × 7) / days_in_month.
 * Uses DAYS_PER_MONTH so pacing matches calendar reality.
 */
export function calcWeeklyTracker(
  monthlyTarget: number,
  weekNumber: number,
  revenueSoFar: number,
  extras: { refunds?: number; chargebacks?: number; fees?: number } = {},
): {
  expectedByNow: number;
  variance: number;
  onTrack: boolean;
  pctOfMonth: number;
  netRevenue: number;
} | null {
  const target = n(monthlyTarget);
  const week = n(weekNumber);
  const soFar = n(revenueSoFar);
  if (!(target > 0) || !(week >= 1 && week <= 5) || !(soFar >= 0)) return null;
  const deductions = optN(extras.refunds) + optN(extras.chargebacks) + optN(extras.fees);
  const netRevenue = Math.max(0, soFar - deductions);
  const daysElapsed = Math.min(week * 7, DAYS_PER_MONTH);
  const expectedByNow = target * (daysElapsed / DAYS_PER_MONTH);
  const variance = netRevenue - expectedByNow;
  return {
    expectedByNow,
    variance,
    onTrack: variance >= 0,
    pctOfMonth: (netRevenue / target) * 100,
    netRevenue,
  };
}

/**
 * Accounting gross margin = (Revenue − COGS) / Revenue.
 * Contribution after variable selling costs when extras are entered.
 */
export function calcGrossMargin(
  revenue: number,
  cogs: number,
  extras: {
    processingFees?: number;
    returns?: number;
    shipping?: number;
    penalties?: number;
  } = {},
): {
  marginPct: number;
  grossProfit: number;
  extraCosts: number;
  accountingGrossProfit: number;
  accountingMarginPct: number;
} | null {
  const rev = n(revenue);
  const cost = n(cogs);
  if (!(rev > 0) || !(cost >= 0) || cost > rev) return null;
  const accountingGrossProfit = rev - cost;
  const accountingMarginPct = (accountingGrossProfit / rev) * 100;
  const extraCosts =
    optN(extras.processingFees) +
    optN(extras.returns) +
    optN(extras.shipping) +
    optN(extras.penalties);
  const grossProfit = accountingGrossProfit - extraCosts;
  return {
    grossProfit,
    marginPct: (grossProfit / rev) * 100,
    extraCosts,
    accountingGrossProfit,
    accountingMarginPct,
  };
}

/**
 * Target price from desired margin on selling price:
 * Price = Cost ÷ (1 − target_margin% − fee% of price).
 * Markup % = (Price − Cost) / Cost — different from margin.
 */
export function calcTargetPrice(
  cost: number,
  targetMarginPct: number,
  extras: {
    platformFeePct?: number;
    processingFeePct?: number;
    taxPct?: number;
  } = {},
): { price: number; markupPct: number; feePctTotal: number } | null {
  const c = n(cost);
  const m = n(targetMarginPct);
  if (!(c > 0) || !(m > 0 && m < 100)) return null;
  const feePctTotal =
    optN(extras.platformFeePct) + optN(extras.processingFeePct) + optN(extras.taxPct);
  const denom = 1 - (m + feePctTotal) / 100;
  if (!(denom > 0)) return null;
  const price = c / denom;
  const markupPct = ((price - c) / c) * 100;
  return { price, markupPct, feePctTotal };
}

/** Net margin = (Revenue − COGS − OpEx − interest/fees) / Revenue. */
export function calcNetMargin(
  revenue: number,
  cogs: number,
  opex: number,
  extras: { interest?: number; loanPenalties?: number; processingFees?: number } = {},
): {
  netProfit: number;
  netMarginPct: number;
  grossMarginPct: number;
  extraExpenses: number;
} | null {
  const rev = n(revenue);
  const cost = n(cogs);
  const op = n(opex);
  if (!(rev > 0) || !(cost >= 0) || !(op >= 0)) return null;
  const extraExpenses =
    optN(extras.interest) + optN(extras.loanPenalties) + optN(extras.processingFees);
  const gross = rev - cost;
  const netProfit = gross - op - extraExpenses;
  return {
    netProfit,
    netMarginPct: (netProfit / rev) * 100,
    grossMarginPct: (gross / rev) * 100,
    extraExpenses,
  };
}

/**
 * ROI % = (Net return − Net investment) / Net investment.
 * Optional monthsHeld → annualized ROI ≈ ((1 + roi)^(12/months) − 1).
 */
export function calcRoi(
  investment: number,
  returnAmount: number,
  extras: {
    financingFees?: number;
    taxesOnGain?: number;
    penalties?: number;
    monthsHeld?: number;
  } = {},
): {
  roiPct: number;
  profit: number;
  netInvestment: number;
  netReturn: number;
  annualizedRoiPct: number | null;
} | null {
  const inv = n(investment);
  const ret = n(returnAmount);
  if (!(inv > 0) || !Number.isFinite(ret)) return null;
  const netInvestment = inv + optN(extras.financingFees);
  const netReturn = ret - optN(extras.taxesOnGain) - optN(extras.penalties);
  const profit = netReturn - netInvestment;
  const roi = profit / netInvestment;
  const months = optN(extras.monthsHeld);
  let annualizedRoiPct: number | null = null;
  if (months > 0) {
    annualizedRoiPct = (Math.pow(1 + roi, 12 / months) - 1) * 100;
  }
  return {
    profit,
    roiPct: roi * 100,
    netInvestment,
    netReturn,
    annualizedRoiPct,
  };
}

/**
 * Processor cost ≈ volume × rate% + (# txns × $ per txn) + fixed annual fees.
 * # txns ≈ volume ÷ average ticket (when ticket is provided).
 */
export function calcProcessorFees(
  annualVolume: number,
  rates: { name: string; ratePct: number }[],
  extras: {
    monthlyGatewayFee?: number;
    chargebackFeesAnnual?: number;
    pciFeesAnnual?: number;
    perTxnFee?: number;
    avgTicket?: number;
  } = {},
): {
  name: string;
  ratePct: number;
  annualFee: number;
  fixedAnnual: number;
  txnFeesAnnual: number;
  estimatedTxns: number;
}[] | null {
  const vol = n(annualVolume);
  if (!(vol > 0) || !rates.length) return null;
  const fixedAnnual =
    optN(extras.monthlyGatewayFee) * 12 +
    optN(extras.chargebackFeesAnnual) +
    optN(extras.pciFeesAnnual);
  const avgTicket = optN(extras.avgTicket);
  const perTxn = optN(extras.perTxnFee);
  const estimatedTxns = avgTicket > 0 ? vol / avgTicket : 0;
  const txnFeesAnnual = perTxn * estimatedTxns;
  const rows = rates.map((r) => {
    const ratePct = n(r.ratePct);
    return {
      name: r.name,
      ratePct,
      fixedAnnual,
      txnFeesAnnual,
      estimatedTxns,
      annualFee:
        Number.isFinite(ratePct) && ratePct >= 0
          ? (vol * ratePct) / 100 + fixedAnnual + txnFeesAnnual
          : NaN,
    };
  });
  if (rows.some((r) => !Number.isFinite(r.annualFee))) return null;
  return rows;
}

/**
 * MCA factor-rate cost, with Rule-of-78 style APR estimate (common for add-on / factor products):
 * APR ≈ (2 × 12 × total_finance_charge) / (advance × (n + 1))
 * Also returns simple annualized rate for comparison.
 */
export function calcMcaApr(
  advance: number,
  factorRate: number,
  termMonths: number,
  extras: { originationFee?: number; latePenalties?: number } = {},
): {
  payback: number;
  cost: number;
  aprPct: number;
  simpleAprPct: number;
  extraFees: number;
} | null {
  const adv = n(advance);
  const factor = n(factorRate);
  const months = n(termMonths);
  if (!(adv > 0) || !(factor > 1) || !(months > 0)) return null;
  const payback = adv * factor;
  const extraFees = optN(extras.originationFee) + optN(extras.latePenalties);
  const cost = payback - adv + extraFees;
  // Simple / flat annualization (often understates true cost of declining balance)
  const simpleAprPct = (cost / adv) * (12 / months) * 100;
  // Rule of 78 / add-on interest approximation used in consumer & MCA education tools
  const aprPct = ((2 * 12 * cost) / (adv * (months + 1))) * 100;
  return { payback, cost, aprPct, simpleAprPct, extraFees };
}

/**
 * Opportunity cost of late AR (standard working-capital formula):
 * Opportunity = Amount × (annual cost of capital) × (days late / 365)
 * Plus contractual late fees / collection / legal if entered.
 */
export function calcLatePaymentCost(
  amount: number,
  daysLate: number,
  annualCostOfCapitalPct: number,
  extras: { lateFees?: number; collectionFees?: number; legalCosts?: number } = {},
): {
  opportunityCost: number;
  dailyCost: number;
  totalCost: number;
  extraFees: number;
} | null {
  const amt = n(amount);
  const days = n(daysLate);
  const apr = n(annualCostOfCapitalPct) / 100;
  if (!(amt > 0) || !(days > 0) || !(apr >= 0)) return null;
  const opportunityCost = amt * apr * (days / DAYS_PER_YEAR);
  const extraFees =
    optN(extras.lateFees) + optN(extras.collectionFees) + optN(extras.legalCosts);
  const totalCost = opportunityCost + extraFees;
  return {
    opportunityCost,
    dailyCost: totalCost / days,
    totalCost,
    extraFees,
  };
}

/**
 * Hiring runway impact + revenue needed to fund the hire:
 * Extra revenue ≈ hire_monthly_cost ÷ contribution_margin% (when CM provided).
 */
export function calcHiringImpact(
  cashBalance: number,
  monthlyBurn: number,
  monthlySalaryAllIn: number,
  extras: {
    recruitingFees?: number;
    trainingMonthly?: number;
    overtimeMonthly?: number;
    severanceMonthly?: number;
    contributionMarginPct?: number;
  } = {},
): {
  runwayBeforeDays: number;
  runwayAfterDays: number;
  extraRevenueNeeded: number;
  effectiveCash: number;
  hireMonthly: number;
  usedContributionMargin: boolean;
} | null {
  const cash = n(cashBalance);
  const burn = n(monthlyBurn);
  const salary = n(monthlySalaryAllIn);
  if (!(cash >= 0) || !(burn >= 0) || !(salary > 0)) return null;
  const recruiting = optN(extras.recruitingFees);
  const hireMonthly =
    salary +
    optN(extras.trainingMonthly) +
    optN(extras.overtimeMonthly) +
    optN(extras.severanceMonthly);
  const effectiveCash = Math.max(0, cash - recruiting);
  const before = burn > 0 ? (cash / burn) * DAYS_PER_MONTH : Infinity;
  const afterBurn = burn + hireMonthly;
  const after = afterBurn > 0 ? (effectiveCash / afterBurn) * DAYS_PER_MONTH : Infinity;
  const cm = optN(extras.contributionMarginPct);
  const usedContributionMargin = cm > 0 && cm < 100;
  const extraRevenueNeeded = usedContributionMargin ? hireMonthly / (cm / 100) : hireMonthly;
  return {
    runwayBeforeDays: before,
    runwayAfterDays: after,
    extraRevenueNeeded,
    effectiveCash,
    hireMonthly,
    usedContributionMargin,
  };
}

/**
 * Fully loaded employer cost ≈ Salary × (1 + burden%).
 * US SMBs often use 25–40% burden for FICA, unemployment, workers’ comp, benefits.
 */
export function calcEmployeeTrueCost(
  annualSalary: number,
  burdenPct: number,
  extras: { signingBonus?: number; severance?: number } = {},
): { allIn: number; extras: number; oneTime: number; monthlyAllIn: number } | null {
  const salary = n(annualSalary);
  const burden = n(burdenPct) / 100;
  if (!(salary > 0) || !(burden >= 0)) return null;
  const burdenExtras = salary * burden;
  const oneTime = optN(extras.signingBonus) + optN(extras.severance);
  const allIn = salary + burdenExtras + oneTime;
  return { extras: burdenExtras, oneTime, allIn, monthlyAllIn: allIn / 12 };
}

/** Labor ratio = total labor cost ÷ revenue (same period). */
export function calcPayrollPct(
  payroll: number,
  revenue: number,
  extras: { contractors?: number; bonuses?: number; agencyMarkups?: number } = {},
): { pct: number; effectivePayroll: number } | null {
  const pay = n(payroll);
  const rev = n(revenue);
  if (!(pay >= 0) || !(rev > 0)) return null;
  const effectivePayroll =
    pay + optN(extras.contractors) + optN(extras.bonuses) + optN(extras.agencyMarkups);
  return { pct: (effectivePayroll / rev) * 100, effectivePayroll };
}

/**
 * Standard amortizing loan payment (PMT):
 * PMT = P × r(1+r)^n / ((1+r)^n − 1), r = annual/12.
 * Total interest = (payment × n) − principal.
 */
export function calcLoanPayment(
  principal: number,
  annualRatePct: number,
  termMonths: number,
  monthlyFreeCash: number,
  extras: {
    originationFee?: number;
    monthlyInsurance?: number;
    prepaymentPenalty?: number;
  } = {},
): {
  payment: number;
  totalPaid: number;
  totalInterest: number;
  affordable: boolean;
  monthlyAllIn: number;
  originationFee: number;
  prepaymentPenalty: number;
  fcfCoveragePct: number;
} | null {
  const p = n(principal);
  const annual = n(annualRatePct) / 100;
  const months = n(termMonths);
  const fcf = n(monthlyFreeCash);
  if (!(p > 0) || !(months > 0) || !(annual >= 0) || !Number.isFinite(fcf)) return null;
  const r = annual / 12;
  const payment =
    r === 0 ? p / months : (p * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  const monthlyInsurance = optN(extras.monthlyInsurance);
  const originationFee = optN(extras.originationFee);
  const prepaymentPenalty = optN(extras.prepaymentPenalty);
  const monthlyAllIn = payment + monthlyInsurance;
  const totalPaid = payment * months + monthlyInsurance * months + originationFee + prepaymentPenalty;
  const totalInterest = payment * months - p;
  const fcfCoveragePct = fcf > 0 ? (monthlyAllIn / fcf) * 100 : Infinity;
  return {
    payment,
    totalPaid,
    totalInterest,
    affordable: fcf >= monthlyAllIn,
    monthlyAllIn,
    originationFee,
    prepaymentPenalty,
    fcfCoveragePct,
  };
}

/**
 * Rough SBA 7(a) size hint: statutory max $5M; rule-of-thumb often ≤ ~50% of annual revenue
 * for planning (not an eligibility determination). Fees added for all-in cash need.
 */
export function calcSbaEstimate(
  annualRevenue: number,
  yearsInBusiness: number,
  requested: number,
  extras: {
    packingFees?: number;
    guaranteeFees?: number;
    processingCharges?: number;
  } = {},
): {
  estimatedMax: number;
  likelyEligible: boolean;
  note: string;
  allInRequest: number;
  feeTotal: number;
} | null {
  const rev = n(annualRevenue);
  const years = n(yearsInBusiness);
  const req = n(requested);
  if (!(rev > 0) || !(years >= 0) || !(req > 0)) return null;
  const feeTotal =
    optN(extras.packingFees) + optN(extras.guaranteeFees) + optN(extras.processingCharges);
  const allInRequest = req + feeTotal;
  const SBA_7A_STATUTORY_MAX = 5_000_000;
  const estimatedMax = Math.min(rev * 0.5, SBA_7A_STATUTORY_MAX);
  const likelyEligible = years >= 2 && rev >= 100_000 && req <= estimatedMax;
  const note = likelyEligible
    ? 'Planning hint only — SBA eligibility also depends on use of proceeds, credit, and lender underwriting. Confirm on SBA.gov.'
    : 'Based on your inputs, eligibility or size may be limited — verify current SBA 7(a) rules on SBA.gov.';
  return { estimatedMax, likelyEligible, note, allInRequest, feeTotal };
}

export type BuyVsLeaseExtras = {
  buyTax?: number;
  buyInterest?: number;
  buyMaintenance?: number;
  residualValue?: number;
  leaseTax?: number;
  leaseMaintenance?: number;
  earlyTerminationPenalty?: number;
  /** Annual discount rate % for NPV (cost of capital). Blank/0 = undiscounted cash totals. */
  discountRatePct?: number;
};

/**
 * Buy vs lease: undiscounted cash comparison, or NPV when discount rate is set.
 * Lease NPV = PV of monthly payments + upfront lease extras + PV of end penalty.
 * Buy NPV = upfront buy costs − PV of residual.
 */
export function calcBuyVsLease(
  purchasePrice: number,
  leaseMonths: number,
  monthlyLease: number,
  extras: BuyVsLeaseExtras = {},
): {
  buyTotal: number;
  leaseTotal: number;
  cheaper: 'buy' | 'lease' | 'same';
  usedNpv: boolean;
  discountRatePct: number;
  buyBreakdown: {
    price: number;
    tax: number;
    interest: number;
    maintenance: number;
    residual: number;
  };
  leaseBreakdown: {
    payments: number;
    tax: number;
    maintenance: number;
    earlyTermination: number;
  };
} | null {
  const price = n(purchasePrice);
  const months = n(leaseMonths);
  const leasePay = n(monthlyLease);
  if (!(price > 0) || !(months > 0) || !(leasePay > 0)) return null;

  const buyTax = optN(extras.buyTax);
  const buyInterest = optN(extras.buyInterest);
  const buyMaintenance = optN(extras.buyMaintenance);
  const residual = optN(extras.residualValue);
  const leaseTax = optN(extras.leaseTax);
  const leaseMaintenance = optN(extras.leaseMaintenance);
  const earlyTermination = optN(extras.earlyTerminationPenalty);
  const discountRatePct = optN(extras.discountRatePct);
  const r = discountRatePct / 100 / 12;
  const usedNpv = discountRatePct > 0;

  const payments = leasePay * months;
  let buyTotal: number;
  let leaseTotal: number;

  if (usedNpv) {
    const residualPv = residual / Math.pow(1 + r, months);
    const earlyPv = earlyTermination / Math.pow(1 + r, months);
    buyTotal = price + buyTax + buyInterest + buyMaintenance - residualPv;
    leaseTotal = pvAnnuity(leasePay, r, months) + leaseTax + leaseMaintenance + earlyPv;
  } else {
    buyTotal = price + buyTax + buyInterest + buyMaintenance - residual;
    leaseTotal = payments + leaseTax + leaseMaintenance + earlyTermination;
  }

  const cheaper =
    Math.abs(buyTotal - leaseTotal) < 0.01
      ? 'same'
      : buyTotal < leaseTotal
        ? 'buy'
        : 'lease';

  return {
    buyTotal,
    leaseTotal,
    cheaper,
    usedNpv,
    discountRatePct,
    buyBreakdown: {
      price,
      tax: buyTax,
      interest: buyInterest,
      maintenance: buyMaintenance,
      residual,
    },
    leaseBreakdown: {
      payments,
      tax: leaseTax,
      maintenance: leaseMaintenance,
      earlyTermination,
    },
  };
}

/**
 * Inventory turns = COGS ÷ average inventory; days on hand = 365 ÷ turns.
 * Optional holding cost = (carrying % × avg inventory) + storage + spoilage + financing.
 */
export function calcInventoryTurnover(
  cogs: number,
  avgInventory: number,
  extras: {
    carryingCost?: number;
    carryingCostPct?: number;
    storageFees?: number;
    spoilage?: number;
    financingCharges?: number;
  } = {},
): {
  turns: number;
  daysOnHand: number;
  holdingCost: number;
} | null {
  const cost = n(cogs);
  const inv = n(avgInventory);
  if (!(cost > 0) || !(inv > 0)) return null;
  const turns = cost / inv;
  const carryingFromPct = inv * (optN(extras.carryingCostPct) / 100);
  const holdingCost =
    optN(extras.carryingCost) +
    carryingFromPct +
    optN(extras.storageFees) +
    optN(extras.spoilage) +
    optN(extras.financingCharges);
  return { turns, daysOnHand: DAYS_PER_YEAR / turns, holdingCost };
}

export function fmtMoney(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

export function fmtMoney2(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });
}

export function fmtDays(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (value === Infinity) return 'No burn entered';
  return `${Math.round(value)} days`;
}

export function fmtPct(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `${value.toFixed(1)}%`;
}
