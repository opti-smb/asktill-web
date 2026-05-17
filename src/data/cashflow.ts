import type { UpcomingItem, InflowCategory, OutflowCategory, MonthBar } from '../types';

export const inflows: InflowCategory[] = [
  { label: 'Card sales', width: '78%', color: 'var(--brand)', value: '$45,820' },
  { label: 'Online', width: '21%', color: 'var(--brand-bright)', value: '$12,414' },
  { label: 'Cash deposits', width: '14%', color: 'var(--brand-light)', value: '$8,400' },
  { label: 'Other', width: '3%', color: 'var(--muted)', value: '$1,820' },
];

export const outflows: OutflowCategory[] = [
  { label: 'Payroll', width: '56%', color: 'var(--neg)', value: '$26,420' },
  { label: 'Inventory', width: '17%', color: '#DC2626', value: '$8,015' },
  { label: 'Rent', width: '9%', color: '#EF4444', value: '$4,200' },
  { label: 'Fees', width: '5%', color: '#F87171', value: '$2,236' },
  { label: 'Other', width: '14%', color: '#FCA5A5', value: '$6,650', opacity: 0.7 },
];

export const inflowMonthBars: MonthBar[] = [
  { label: 'Jan', value: '$48,520', height: 44, y: 36, rx: '3', fill: '#DBEAFE', textFill: '#1E40AF', x: 20 },
  { label: 'Feb', value: '$51,821', height: 52, y: 28, rx: '3', fill: '#93C5FD', textFill: '#1E40AF', x: 100 },
  { label: 'Mar', value: '$58,234', height: 64, y: 16, rx: '3', fill: '#1E40AF', textFill: '#1E40AF', x: 180 },
];

export const outflowMonthBars: MonthBar[] = [
  { label: 'Jan', value: '$38,720', height: 40, y: 40, rx: '3', fill: '#FEE2E2', textFill: '#B91C1C', x: 20 },
  { label: 'Feb', value: '$41,260', height: 48, y: 32, rx: '3', fill: '#FCA5A5', textFill: '#B91C1C', x: 100 },
  { label: 'Mar', value: '$47,521', height: 62, y: 18, rx: '3', fill: '#B91C1C', textFill: '#B91C1C', x: 180 },
];

export const upcomingItems: UpcomingItem[] = [
  { day: '1', month: 'Apr', title: 'Square payouts settle', sub: 'Mar 30–31 sales · T+1', amount: '$2,235', type: 'in' },
  { day: '1', month: 'Apr', title: 'Stripe weekly batch', sub: 'Last week of Shopify orders', amount: '$2,989', type: 'in' },
  { day: '5', month: 'Apr', title: 'Rent · landlord ACH', sub: 'Recurring monthly', amount: '$4,200', type: 'out' },
  { day: '8', month: 'Apr', title: 'Gusto payroll', sub: 'Bi-weekly · 4 employees', amount: '$9,240', type: 'out' },
  { day: '10', month: 'Apr', title: 'Counterculture Coffee', sub: 'Weekly wholesale order', amount: '$1,940', type: 'out' },
  { day: '12', month: 'Apr', title: 'Sales tax · NY state', sub: 'Monthly remittance', amount: '$5,170', type: 'out' },
];
