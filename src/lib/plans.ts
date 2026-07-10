export interface PlanDefinition {
  id: string;
  name: string;
  price: string;
  period: string;
  items: string[];
  highlight: string;
  cta: string;
  primary: boolean;
  featured?: boolean;
}

export const PLANS: PlanDefinition[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    items: ['1 statement month on file', 'AT Letter included', '50 pts each'],
    highlight: '1 statement month on file',
    cta: 'Get started',
    primary: false,
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '$10',
    period: 'per month',
    items: ['Multi-month uploads', 'AT Letter included', '75 pts + 200 bonus'],
    highlight: 'Multi-month uploads',
    cta: 'Get Starter',
    primary: false,
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '$20',
    period: 'per month',
    items: ['Multi-month uploads', 'AT Letter + benchmarks', '100 pts + 500 bonus'],
    highlight: 'Multi-month uploads',
    cta: 'Get Growth',
    primary: true,
    featured: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$30',
    period: 'per month',
    items: ['Unlimited months', 'AT Letter + white-label', '150 pts + 2,000 bonus'],
    highlight: 'Unlimited months',
    cta: 'Get Pro',
    primary: false,
  },
];

export function getPlanById(planId: string | null | undefined): PlanDefinition | undefined {
  const id = planId?.trim().toLowerCase();
  if (!id || id === 'free') return undefined;
  return PLANS.find((plan) => plan.id === id);
}
