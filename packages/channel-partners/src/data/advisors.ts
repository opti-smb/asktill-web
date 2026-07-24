/** Sample CPAs & tax advisors for Channel Partners. */

export type TaxAdvisor = {
  id: string;
  name: string;
  credential: string;
  firm: string;
  experienceYears: number;
  location: string;
  specialties: string[];
  rating: number;
  reviewCount: number;
  rateFrom: string;
  /** Hourly consultation fee used for wallet redeem math. */
  consultationFeeUsd: number;
  availability: string;
  availableTone: 'today' | 'soon';
};

export const TAX_ADVISORS: TaxAdvisor[] = [
  {
    id: 'sarah-johnson',
    name: 'Sarah Johnson',
    credential: 'CPA',
    firm: 'Johnson Financial Advisors',
    experienceYears: 14,
    location: 'Austin, TX',
    specialties: [
      'Business Tax Planning',
      'Bookkeeping',
      'Financial Statements',
      'LLC & S-Corp Tax',
    ],
    rating: 4.9,
    reviewCount: 312,
    rateFrom: 'From $250/hour',
    consultationFeeUsd: 250,
    availability: 'Available Today',
    availableTone: 'today',
  },
  {
    id: 'michael-chen',
    name: 'Michael Chen',
    credential: 'CPA',
    firm: 'Chen Tax & Accounting',
    experienceYears: 10,
    location: 'San Jose, CA',
    specialties: ['Tax Filing', 'QuickBooks', 'Payroll', 'Startup Accounting'],
    rating: 4.8,
    reviewCount: 186,
    rateFrom: 'From $200/hour',
    consultationFeeUsd: 200,
    availability: 'Available Tomorrow',
    availableTone: 'soon',
  },
];
