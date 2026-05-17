import type { LandingStat, HowStep, IntelFeature, QCard, GrowFeature } from '../types';

export const landingStats: LandingStat[] = [
  { num: '3 hrs', label: 'Every Sunday night', sublabel: 'Stitching dashboards together' },
  { num: '3', label: 'Different numbers', sublabel: 'For the same week of sales' },
  { num: '94%', label: 'Of owners reconcile manually', sublabel: 'Most give up before they finish' },
];

export const howSteps: HowStep[] = [
  {
    title: 'Connect',
    description: 'Upload bank, POS, and ecommerce. CSV or PDF. Two minutes.',
    iconPath: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8 12 3 7 8M12 3v12',
  },
  {
    title: 'Reconcile',
    description: 'AI matches every transaction. Flags every gap. In seconds.',
    iconPath: 'M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  },
  {
    title: 'Ask',
    description: 'Type any question. Get a real answer. Plain English.',
    iconPath: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z',
  },
];

export const intelFeatures: IntelFeature[] = [
  {
    title: 'Reconciliation across sources',
    description: 'POS, bank, ecommerce — matched line by line.',
    iconPath: 'M22 12h-4l-3 9L9 3l-3 9H2',
  },
  {
    title: 'Anomalies, automatically',
    description: 'Unexpected fees, drops, spikes — flagged before they cost you.',
    iconPath: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
  },
  {
    title: 'Cohort and LTV insights',
    description: 'Customer segments, retention, lifetime value — in one sentence.',
    iconPath: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  },
  {
    title: 'Cash flow forecasts',
    description: '"Can I make payroll Friday?" — answered with math, not gut.',
    iconPath: 'M12 20v-10M18 20V4M6 20v-4',
  },
  {
    title: 'Peer benchmarking',
    description: '"Are your card fees competitive?" — anonymous, real-time.',
    iconPath: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
  },
];

export const qCards: QCard[] = [
  {
    text: '"Which channel drove repeat customers, not just one-time orders?"',
    iconPath: 'M12 20v-10M18 20V4M6 20v-4',
  },
  {
    text: '"What\'s my real margin after fees, refunds, and chargebacks?"',
    iconPath: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  },
  {
    text: '"Why is location #3\'s labor cost 8% higher than the others?"',
    iconPath: 'M3 3h18v18H3zM9 3v18M15 3v18',
  },
  {
    text: '"Roll up all three entities into one P&L for last month."',
    iconPath: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6',
  },
  {
    text: '"Which 5 vendors had the biggest cost increase vs last year?"',
    iconPath: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6',
  },
  {
    text: '"If I cut Tuesday hours by 25%, what\'s the impact on weekly margin?"',
    iconPath: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  },
];

export const growFeatures: GrowFeature[] = [
  {
    title: 'Working capital',
    description: '$2K-25K loans, underwritten from your real numbers. Funded in 24 hours.',
    iconPath: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  },
  {
    title: 'Business banking',
    description: 'Account + debit card, built on data we already understand.',
    iconPath: 'M2 5h20v14H2zM2 10h20',
  },
  {
    title: 'Business card',
    description: 'Spending limits that flex with your seasons. Cashback on the things you buy.',
    iconPath: 'M1 4h22v16H1zM1 10h22',
  },
  {
    title: 'You stay free',
    description: "Don't want financial services? Keep using the analytics. Always free.",
    iconPath: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  },
];
