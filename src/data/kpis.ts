import type { KPI } from '../types';

export const kpis: KPI[] = [
  {
    label: 'Revenue',
    value: '$58,234',
    delta: '▲ 12.4%',
    deltaType: 'up',
    prev: 'Feb: $51,821',
    avgLabel: '3-mo avg: $52,840',
    avgNote: '+10.2% above avg',
    avgNoteType: 'pos',
    sparkBars: [
      { x: 6, y: 14, height: 14, fill: '#CBD5E1', label: '3mo avg', labelFill: '#64748B' },
      { x: 64, y: 12, height: 16, fill: '#94A3B8', label: 'Feb', labelFill: '#64748B' },
      { x: 122, y: 6, height: 22, fill: '#1E40AF', label: 'Mar', labelFill: '#1E40AF' },
    ],
  },
  {
    label: 'Cash position',
    value: '$27,341',
    delta: '▲ 13.3%',
    deltaType: 'up',
    prev: 'Feb: $24,136',
    avgLabel: '3-mo avg: $23,950',
    avgNote: '+14.2% above avg',
    avgNoteType: 'pos',
    sparkBars: [
      { x: 6, y: 16, height: 12, fill: '#CBD5E1', label: '3mo avg', labelFill: '#64748B' },
      { x: 64, y: 14, height: 14, fill: '#94A3B8', label: 'Feb', labelFill: '#64748B' },
      { x: 122, y: 8, height: 20, fill: '#047857', label: 'Mar', labelFill: '#047857' },
    ],
  },
  {
    label: 'Net margin',
    value: '18.4%',
    delta: '▼ 2.1 pts',
    deltaType: 'down',
    prev: 'Feb: 20.5%',
    avgLabel: '3-mo avg: 19.8%',
    avgNote: '-1.4 pts below avg',
    avgNoteType: 'neg',
    sparkBars: [
      { x: 6, y: 10, height: 18, fill: '#CBD5E1', label: '3mo avg', labelFill: '#64748B' },
      { x: 64, y: 9, height: 19, fill: '#94A3B8', label: 'Feb', labelFill: '#64748B' },
      { x: 122, y: 14, height: 14, fill: '#B91C1C', label: 'Mar', labelFill: '#B91C1C' },
    ],
  },
  {
    label: 'Days of runway',
    value: '52',
    delta: '— same',
    deltaType: 'flat',
    prev: 'Feb: 51',
    avgLabel: '3-mo avg: 50 days',
    avgNote: 'stable',
    avgNoteType: 'muted',
    sparkBars: [
      { x: 6, y: 12, height: 16, fill: '#CBD5E1', label: '3mo avg', labelFill: '#64748B' },
      { x: 64, y: 12, height: 16, fill: '#94A3B8', label: 'Feb', labelFill: '#64748B' },
      { x: 122, y: 11, height: 17, fill: '#64748B', label: 'Mar', labelFill: '#64748B' },
    ],
  },
];
