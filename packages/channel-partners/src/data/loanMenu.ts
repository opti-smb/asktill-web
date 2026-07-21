/** Paisabazaar-style Loans menu: left headings → right link lists. */

export type LoanMenuLink = {
  id: string;
  label: string;
  /** Route to product detail + banks when set */
  productId: string;
};

export type LoanMenuSection = {
  title: string;
  links: LoanMenuLink[];
};

export type LoanHeading = {
  id: string;
  title: string;
  /** Short mark shown in the left rail */
  mark: string;
  sections: LoanMenuSection[];
};

export const LOAN_HEADINGS: LoanHeading[] = [
  {
    id: 'personal',
    title: 'Personal Loan',
    mark: 'PL',
    sections: [
      {
        title: 'Overview',
        links: [
          { id: 'pl-main', label: 'Personal Loan', productId: 'personal-loan' },
          { id: 'pl-rates', label: 'Interest Rates', productId: 'personal-loan' },
          { id: 'pl-emi', label: 'EMI Calculator', productId: 'personal-loan' },
          { id: 'pl-eligible', label: 'Eligibility', productId: 'personal-loan' },
        ],
      },
      {
        title: 'By Type',
        links: [
          { id: 'pl-salaried', label: 'Personal Loan for Salaried', productId: 'personal-loan-salaried' },
          { id: 'pl-self', label: 'Personal Loan for Self Employed', productId: 'personal-loan-self-employed' },
          { id: 'pl-instant', label: 'Instant Personal Loan', productId: 'personal-loan-instant' },
        ],
      },
      {
        title: 'By Amount',
        links: [
          { id: 'pl-1l', label: '1 Lakh Personal Loan', productId: 'personal-loan' },
          { id: 'pl-5l', label: '5 Lakh Personal Loan', productId: 'personal-loan' },
          { id: 'pl-10l', label: '10 Lakh Personal Loan', productId: 'personal-loan' },
        ],
      },
    ],
  },
  {
    id: 'business',
    title: 'Business Loan',
    mark: 'BL',
    sections: [
      {
        title: 'Overview',
        links: [
          { id: 'bl-main', label: 'Business Loan', productId: 'business-loan' },
          { id: 'bl-wc', label: 'Working Capital Loan', productId: 'working-capital' },
          { id: 'bl-mach', label: 'Machinery Loan', productId: 'machinery-loan' },
          { id: 'bl-msme', label: 'MSME / Shopkeeper Loan', productId: 'msme-shopkeeper' },
        ],
      },
      {
        title: 'By Need',
        links: [
          { id: 'bl-expand', label: 'Loan for Business Expansion', productId: 'business-loan' },
          { id: 'bl-inventory', label: 'Inventory / Stock Funding', productId: 'working-capital' },
          { id: 'bl-equip', label: 'Equipment Finance', productId: 'machinery-loan' },
        ],
      },
    ],
  },
  {
    id: 'home',
    title: 'Home Loan',
    mark: 'HL',
    sections: [
      {
        title: 'Overview',
        links: [
          { id: 'hl-main', label: 'Home Loan', productId: 'home-loan' },
          { id: 'hl-rates', label: 'Interest Rates', productId: 'home-loan' },
          { id: 'hl-bt', label: 'Balance Transfer', productId: 'home-loan-balance-transfer' },
          { id: 'hl-eligible', label: 'Eligibility', productId: 'home-loan' },
        ],
      },
      {
        title: 'By Profession',
        links: [
          { id: 'hl-self', label: 'Home Loan for Self Employed', productId: 'home-loan-self-employed' },
          { id: 'hl-women', label: 'Home Loan for Women', productId: 'home-loan-women' },
        ],
      },
      {
        title: 'By Amount',
        links: [
          { id: 'hl-10', label: '10 Lakh Home Loan', productId: 'home-loan' },
          { id: 'hl-20', label: '20 Lakh Home Loan', productId: 'home-loan' },
          { id: 'hl-30', label: '30 Lakh Home Loan', productId: 'home-loan' },
          { id: 'hl-50', label: '50 Lakh Home Loan', productId: 'home-loan' },
        ],
      },
      {
        title: 'By Schemes',
        links: [
          { id: 'hl-reno', label: 'Home Renovation Loan', productId: 'home-renovation-loan' },
          { id: 'hl-plot', label: 'Plot Loan', productId: 'plot-loan' },
          { id: 'hl-nri', label: 'NRI Home Loan', productId: 'home-loan-nri' },
        ],
      },
    ],
  },
  {
    id: 'other',
    title: 'Other Loans',
    mark: 'OL',
    sections: [
      {
        title: 'Popular',
        links: [
          { id: 'ol-gold', label: 'Gold Loan', productId: 'gold-loan' },
          { id: 'ol-edu', label: 'Education Loan', productId: 'education-loan' },
          { id: 'ol-car', label: 'Car Loan', productId: 'car-loan' },
          { id: 'ol-lap', label: 'Loan Against Property', productId: 'loan-against-property' },
        ],
      },
    ],
  },
];

export function getLoanHeading(id: string): LoanHeading | undefined {
  return LOAN_HEADINGS.find((h) => h.id === id);
}
