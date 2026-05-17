import type { ReconTransaction } from '../types';

export const reconTransactions: ReconTransaction[] = [
  {
    date: 'Mar 18',
    source: 'Stripe — Chargeback',
    meta: 'Customer: J. Patel · Order #SH-2847',
    status: 'flagged',
    statusLabel: 'Disputed',
    description: 'Customer-initiated dispute via card issuer. 14 days to respond.',
    amount: '-$128.50',
    amountType: 'neg',
    action: 'Resolve →',
  },
  {
    date: 'Mar 22',
    source: 'Square — Unknown refund',
    meta: 'No matching original transaction',
    status: 'flagged',
    statusLabel: 'Unmatched',
    description: '$76.50 refund issued but no sale on record. Possibly POS error.',
    amount: '-$76.50',
    amountType: 'neg',
    action: 'Investigate →',
  },
  {
    date: 'Mar 22',
    source: 'Chase — Overdraft fee',
    meta: 'First overdraft fee in 6 months',
    status: 'flagged',
    statusLabel: 'Anomaly',
    description: 'Payroll Mar 15 ran before Stripe deposit cleared Mar 17.',
    amount: '-$35.00',
    amountType: 'neg',
    action: 'Fix timing →',
  },
  {
    date: 'Mar 25',
    source: 'Bumble HQ — Catering invoice',
    meta: 'Invoice #INV-2026-038 · Net 15',
    status: 'pending',
    statusLabel: 'Overdue',
    description: 'Invoice issued Mar 10. Due Mar 25. Now 6 days overdue.',
    amount: '$1,420.00',
    amountType: 'warn',
    action: 'Follow up →',
  },
];

export const reconSummary = {
  matched: 2016,
  total: 2019,
  inFlight: '$5,224',
  inFlightBatches: 3,
  flagged: 3,
  flaggedAmount: '$255',
};
