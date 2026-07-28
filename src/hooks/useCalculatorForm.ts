import { useCallback, useState } from 'react';
import {
  getCalculator,
  getCalculatorGroupFor,
  type CalculatorId,
} from '@asktill/calculators';

export type NumMap = Record<string, string>;

export const EMPTY_FIELDS: Record<CalculatorId, NumMap> = {
  'cash-runway': {
    cash: '',
    burn: '',
    overdraft: '',
    loanPenalties: '',
    processingFees: '',
    taxes: '',
  },
  'cash-flow-forecast': {
    cash: '',
    inflow: '',
    outflow: '',
    interest: '',
    penalties: '',
    oneTimeFees: '',
    growth: '',
  },
  'weekly-cash-flow': {
    target: '',
    week: '',
    soFar: '',
    refunds: '',
    chargebacks: '',
    fees: '',
  },
  'net-margin': {
    revenue: '',
    cogs: '',
    opex: '',
    interest: '',
    loanPenalties: '',
    processingFees: '',
  },
  'gross-margin': {
    revenue: '',
    cogs: '',
    processingFees: '',
    returns: '',
    shipping: '',
    penalties: '',
  },
  'break-even': {
    fixed: '',
    margin: '',
    processingFeePct: '',
    loanCharges: '',
    salesTax: '',
  },
  'processor-compare': {
    volume: '',
    gatewayMonthly: '',
    chargebacks: '',
    pci: '',
    perTxn: '',
    avgTicket: '',
  },
  'payroll-pct-revenue': {
    payroll: '',
    revenue: '',
    contractors: '',
    bonuses: '',
    agency: '',
  },
  'hiring-affordability': {
    cash: '',
    burn: '',
    salary: '',
    recruiting: '',
    training: '',
    overtime: '',
    severance: '',
    contributionMargin: '',
  },
  roi: {
    investment: '',
    returnAmount: '',
    financingFees: '',
    taxes: '',
    penalties: '',
    monthsHeld: '',
  },
  'buy-vs-lease': {
    price: '',
    months: '',
    lease: '',
    cashAvailable: '',
    buyTax: '',
    buyInterest: '',
    buyMaintenance: '',
    residual: '',
    leaseTax: '',
    leaseMaintenance: '',
    earlyTermination: '',
    discountRate: '',
  },
  'late-payment-cost': {
    amount: '',
    daysLate: '',
    costOfCapital: '',
    lateFees: '',
    collectionFees: '',
    legalCosts: '',
  },
  'employee-true-cost': {
    salary: '',
    burden: '',
    signingBonus: '',
    severance: '',
  },
  'loan-affordability': {
    principal: '',
    rate: '',
    months: '',
    freeCash: '',
    origination: '',
    insurance: '',
    prepay: '',
  },
  'pricing-margin': { cost: '', margin: '', platformFee: '', processingFee: '', tax: '' },
  'mca-apr': { advance: '', factor: '', months: '', origination: '', latePenalties: '' },
  'sba-eligibility': {
    revenue: '',
    years: '',
    requested: '',
    packing: '',
    guarantee: '',
    processing: '',
  },
  'inventory-turnover': {
    cogs: '',
    inventory: '',
    carrying: '',
    carryingPct: '',
    storage: '',
    spoilage: '',
    financing: '',
  },
};

/** Statement values win; never invent industry rates / calendar week / fake COGS. */
export function mergeDefaults(id: CalculatorId, fromStmt: NumMap): NumMap {
  const base = { ...EMPTY_FIELDS[id] };
  for (const [k, v] of Object.entries(fromStmt)) {
    if (v !== '' && v != null) base[k] = v;
  }
  return base;
}

/** Form state for calculator inputs — statement hydration stays in the page. */
export function useCalculatorForm() {
  const [selectedId, setSelectedId] = useState<CalculatorId | null>(null);
  const active = selectedId ? getCalculator(selectedId) : undefined;
  const [values, setValues] = useState<NumMap>({});
  const [openGroupIds, setOpenGroupIds] = useState<string[]>([]);

  const setField = useCallback((name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const openCalculator = useCallback((id: CalculatorId, fromStmt?: NumMap) => {
    setSelectedId(id);
    setValues(mergeDefaults(id, fromStmt ?? {}));
    const group = getCalculatorGroupFor(id);
    if (group) {
      setOpenGroupIds((prev) => (prev.includes(group.id) ? prev : [...prev, group.id]));
    }
  }, []);

  const toggleGroup = useCallback((groupId: string) => {
    setOpenGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId],
    );
  }, []);

  return {
    selectedId,
    setSelectedId,
    active,
    values,
    setValues,
    openGroupIds,
    setOpenGroupIds,
    setField,
    openCalculator,
    toggleGroup,
  };
}
