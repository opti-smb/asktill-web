export type PartnerCategory = {
  id: string;
  title: string;
  blurb: string;
  path: string;
};

export type BankOffer = {
  id: string;
  name: string;
  brand: string;
  domain: string;
  rateFrom: string;
  amountUpTo: string;
  processingFee: string;
  applyUrl: string;
};

export type LoanProduct = {
  id: string;
  name: string;
  tagline: string;
  amountRange: string;
  rateFrom: string;
  tenure: string;
  highlights: string[];
  eligibility: string[];
  documents: string[];
  /** Per product — Paisabazaar changes lenders by loan type. */
  banks: BankOffer[];
};

type LenderBase = {
  id: string;
  name: string;
  brand: string;
  domain: string;
};

const L: Record<string, LenderBase> = {
  hdfc: { id: 'hdfc', name: 'HDFC Bank', brand: '#004C8F', domain: 'hdfcbank.com' },
  icici: { id: 'icici', name: 'ICICI Bank', brand: '#F37A20', domain: 'icicibank.com' },
  sbi: { id: 'sbi', name: 'State Bank of India', brand: '#21A0D2', domain: 'sbi.co.in' },
  axis: { id: 'axis', name: 'Axis Bank', brand: '#97144D', domain: 'axisbank.com' },
  kotak: { id: 'kotak', name: 'Kotak Mahindra Bank', brand: '#ED1C24', domain: 'kotak.com' },
  idfc: { id: 'idfc', name: 'IDFC FIRST Bank', brand: '#9B1D20', domain: 'idfcfirstbank.com' },
  bajaj: { id: 'bajaj', name: 'Bajaj Finserv', brand: '#0072BC', domain: 'bajajfinserv.in' },
  tata: { id: 'tata', name: 'Tata Capital', brand: '#1E4D8C', domain: 'tatacapital.com' },
  federal: { id: 'federal', name: 'Federal Bank', brand: '#0033A0', domain: 'federalbank.co.in' },
  indusind: { id: 'indusind', name: 'IndusInd Bank', brand: '#6B2D5B', domain: 'indusind.com' },
  rbl: { id: 'rbl', name: 'RBL Bank', brand: '#003DA5', domain: 'rblbank.com' },
  lendingkart: { id: 'lendingkart', name: 'Lendingkart', brand: '#00A3E0', domain: 'lendingkart.com' },
  flexiloans: { id: 'flexiloans', name: 'FlexiLoans', brand: '#FF6B00', domain: 'flexiloans.com' },
  indifi: { id: 'indifi', name: 'Indifi', brand: '#2E5BFF', domain: 'indifi.com' },
  neogrowth: { id: 'neogrowth', name: 'NeoGrowth', brand: '#E31C79', domain: 'neogrowth.in' },
  ugro: { id: 'ugro', name: 'UGRO Capital', brand: '#0B3D91', domain: 'ugrocapital.com' },
  hdb: { id: 'hdb', name: 'HDB Financial Services', brand: '#003366', domain: 'hdbfs.com' },
  rupeek: { id: 'rupeek', name: 'Rupeek', brand: '#00B26F', domain: 'rupeek.com' },
  iifl: { id: 'iifl', name: 'IIFL Finance', brand: '#003399', domain: 'iifl.com' },
  canara: { id: 'canara', name: 'Canara Bank', brand: '#FF6600', domain: 'canarabank.com' },
  pnb: { id: 'pnb', name: 'Punjab National Bank', brand: '#F15A29', domain: 'pnbindia.in' },
  boi: { id: 'boi', name: 'Bank of India', brand: '#003399', domain: 'bankofindia.co.in' },
};

function offer(
  lender: LenderBase,
  rateFrom: string,
  amountUpTo: string,
  processingFee: string,
  applyUrl: string,
): BankOffer {
  return { ...lender, rateFrom, amountUpTo, processingFee, applyUrl };
}

/**
 * Paisabazaar pattern: lender mix changes by loan category.
 * Personal ≠ Home ≠ Business ≠ Gold (some banks overlap, specialists differ).
 */
const BANKS = {
  /** Paisabazaar Personal Loan partners */
  personal: [
    offer(L.hdfc, '9.99% p.a.', 'Up to ₹50 lakh', 'Up to ₹6,500', 'https://www.hdfcbank.com/personal/borrow/popular-loans/personal-loan'),
    offer(L.icici, '9.99% p.a.', 'Up to ₹50 lakh', 'Up to 2%', 'https://www.icicibank.com/personal-banking/loans/personal-loan'),
    offer(L.axis, '9.99% p.a.', 'Up to ₹40 lakh', 'Up to 2%', 'https://www.axisbank.com/retail/loans/personal-loan'),
    offer(L.kotak, '9.99% p.a.', 'Up to ₹1 crore', 'Up to 5%', 'https://www.kotak.com/en/personal-banking/loans/personal-loan.html'),
    offer(L.bajaj, '10.00% p.a.', 'Up to ₹55 lakh', 'Up to 3.93%', 'https://www.bajajfinserv.in/personal-loan'),
    offer(L.idfc, '9.99% p.a.', 'Up to ₹15 lakh', 'Up to 2%', 'https://www.idfcfirstbank.com/personal-banking/loans/personal-loan'),
    offer(L.federal, '12.00% p.a.', 'Up to ₹25 lakh', 'Up to 2%', 'https://www.federalbank.co.in/personal-loan'),
    offer(L.indusind, '10.35% p.a.', 'Up to ₹5 lakh', 'Up to 3.5%', 'https://www.indusind.com/in/en/personal/loans/personal-loan.html'),
    offer(L.rbl, '11.00% p.a.', 'Up to ₹20 lakh', 'As applicable', 'https://www.rblbank.com/personal-banking/loans/personal-loan'),
    offer(L.tata, '10.99% p.a.', 'Up to ₹35 lakh', 'Up to 3.5%', 'https://www.tatacapital.com/personal-loan.html'),
  ],
  /** Paisabazaar Home Loan — banks + HFCs; SBI featured */
  home: [
    offer(L.sbi, '8.35% p.a.', 'As per eligibility', 'As applicable', 'https://homeloans.sbi/'),
    offer(L.hdfc, '8.50% p.a.', 'As per eligibility', 'As applicable', 'https://www.hdfc.com/home-loan'),
    offer(L.icici, '8.75% p.a.', 'As per eligibility', 'As applicable', 'https://www.icicibank.com/personal-banking/loans/home-loan'),
    offer(L.axis, '8.70% p.a.', 'As per eligibility', 'As applicable', 'https://www.axisbank.com/retail/loans/home-loan'),
    offer(L.kotak, '8.70% p.a.', 'As per eligibility', 'As applicable', 'https://www.kotak.com/en/personal-banking/loans/home-loan.html'),
    offer(L.federal, '8.75% p.a.', 'As per eligibility', 'As applicable', 'https://www.federalbank.co.in/home-loan'),
    offer(L.idfc, '8.85% p.a.', 'As per eligibility', 'As applicable', 'https://www.idfcfirstbank.com/personal-banking/loans/home-loan'),
    offer(L.indusind, '8.90% p.a.', 'As per eligibility', 'As applicable', 'https://www.indusind.com/in/en/personal/loans/home-loan.html'),
    offer(L.rbl, '8.95% p.a.', 'As per eligibility', 'As applicable', 'https://www.rblbank.com/personal-banking/loans/home-loan'),
  ],
  /** Paisabazaar Business Loan partners */
  business: [
    offer(L.hdfc, '10.75% p.a.', 'Up to ₹1 crore', 'Up to 2%', 'https://www.hdfcbank.com/personal/borrow/popular-loans/business-loan'),
    offer(L.axis, '10.99% p.a.', 'Up to ₹75 lakh', 'Up to 2%', 'https://www.axisbank.com/business-banking/loans/business-loan'),
    offer(L.icici, '11.75% p.a.', 'Up to ₹50 lakh', 'Up to 2%', 'https://www.icicibank.com/business-banking/loans/business-loan'),
    offer(L.idfc, '10.50% p.a.', 'Up to ₹50 lakh', 'Up to 2%', 'https://www.idfcfirstbank.com/business-banking/loans/business-loan'),
    offer(L.kotak, '16.00% p.a.', 'Up to ₹50 lakh', 'As applicable', 'https://www.kotak.com/en/business/loans/business-loan.html'),
    offer(L.tata, '12.00% p.a.', 'Up to ₹75 lakh', 'As applicable', 'https://www.tatacapital.com/business-loan.html'),
    offer(L.bajaj, '14.00% p.a.', 'Up to ₹80 lakh', 'As applicable', 'https://www.bajajfinserv.in/business-loan'),
    offer(L.indusind, '12.50% p.a.', 'Up to ₹50 lakh', 'As applicable', 'https://www.indusind.com/in/en/business/loans.html'),
    offer(L.federal, '12.00% p.a.', 'Up to ₹50 lakh', 'As applicable', 'https://www.federalbank.co.in/'),
  ],
  /** Working capital — PB-style banks + WC NBFCs */
  workingCapital: [
    offer(L.hdfc, '11.00% p.a.', 'Up to ₹75 lakh', 'Up to 2%', 'https://www.hdfcbank.com/personal/borrow/popular-loans/business-loan'),
    offer(L.icici, '11.25% p.a.', 'Up to ₹75 lakh', 'Up to 1.5%', 'https://www.icicibank.com/business-banking/loans/working-capital'),
    offer(L.axis, '11.50% p.a.', 'Up to ₹75 lakh', 'Up to 2%', 'https://www.axisbank.com/business-banking/loans/business-loan'),
    offer(L.kotak, '14.00% p.a.', 'Up to ₹50 lakh', 'As applicable', 'https://www.kotak.com/en/business/loans/working-capital.html'),
    offer(L.idfc, '11.00% p.a.', 'Up to ₹50 lakh', 'Up to 2%', 'https://www.idfcfirstbank.com/business-banking/loans/business-loan'),
    offer(L.tata, '13.00% p.a.', 'Up to ₹50 lakh', 'As applicable', 'https://www.tatacapital.com/business-loan.html'),
    offer(L.lendingkart, '12.00% p.a.', 'Up to ₹60 lakh', 'As applicable', 'https://www.lendingkart.com/working-capital-loan/'),
    offer(L.flexiloans, '1% per month', 'Up to ₹1 crore', 'As applicable', 'https://flexiloans.com/working-capital-loan'),
    offer(L.indifi, '1.50% per month', 'Up to ₹50 lakh', 'As applicable', 'https://www.indifi.com/working-capital-loan'),
    offer(L.neogrowth, '15.00% p.a.', 'Up to ₹75 lakh', 'As applicable', 'https://www.neogrowth.in/working-capital-loan/'),
  ],
  /** Machinery / equipment */
  machinery: [
    offer(L.sbi, '9.50% p.a.', 'As per scheme', 'As applicable', 'https://sbi.co.in/web/business/sme/sme-loans'),
    offer(L.hdfc, '10.25% p.a.', 'Up to ₹2 crore', 'Up to 1%', 'https://www.hdfcbank.com/sme/loans/equipment-and-machinery-loan'),
    offer(L.icici, '10.75% p.a.', 'Up to ₹1.5 crore', 'Up to 1.5%', 'https://www.icicibank.com/business-banking/loans/business-loan'),
    offer(L.axis, '10.50% p.a.', 'Up to ₹1.5 crore', 'Up to 1.5%', 'https://www.axisbank.com/business-banking/loans'),
    offer(L.kotak, '12.00% p.a.', 'Up to ₹1 crore', 'As applicable', 'https://www.kotak.com/en/business/loans/business-loan.html'),
    offer(L.hdb, '11.00% p.a.', 'Up to ₹1 crore', 'As applicable', 'https://www.hdbfs.com/products/loans-against-property-and-machinery'),
    offer(L.ugro, '12.00% p.a.', 'Up to ₹5 crore', 'As applicable', 'https://www.ugrocapital.com/'),
    offer(L.tata, '11.50% p.a.', 'Up to ₹1 crore', 'As applicable', 'https://www.tatacapital.com/business-loan.html'),
  ],
  /** MSME / shopkeeper */
  msme: [
    offer(L.hdfc, '11.50% p.a.', 'Up to ₹50 lakh', 'Up to 2%', 'https://www.hdfcbank.com/personal/borrow/popular-loans/business-loan'),
    offer(L.icici, '12.00% p.a.', 'Up to ₹50 lakh', 'Up to 2%', 'https://www.icicibank.com/business-banking/loans/business-loan'),
    offer(L.axis, '12.00% p.a.', 'Up to ₹50 lakh', 'Up to 2%', 'https://www.axisbank.com/business-banking/loans/business-loan'),
    offer(L.sbi, '9.75% p.a.', 'MSME schemes', 'As applicable', 'https://sbi.co.in/web/business/sme'),
    offer(L.bajaj, '13.00% p.a.', 'Up to ₹45 lakh', 'As applicable', 'https://www.bajajfinserv.in/business-loan'),
    offer(L.tata, '14.00% p.a.', 'Up to ₹40 lakh', 'As applicable', 'https://www.tatacapital.com/business-loan.html'),
    offer(L.flexiloans, '1% per month', 'Up to ₹50 lakh', 'As applicable', 'https://flexiloans.com/'),
    offer(L.lendingkart, '12.00% p.a.', 'Up to ₹35 lakh', 'As applicable', 'https://www.lendingkart.com/'),
    offer(L.indifi, '1.50% per month', 'Up to ₹30 lakh', 'As applicable', 'https://www.indifi.com/'),
    offer(L.neogrowth, '15.00% p.a.', 'Up to ₹50 lakh', 'As applicable', 'https://www.neogrowth.in/'),
  ],
  /** Paisabazaar Gold Loan */
  gold: [
    offer(L.sbi, '8.75% p.a.', 'As per gold value', 'As applicable', 'https://sbi.co.in/web/personal-banking/loans/personal-loans/gold-loan'),
    offer(L.boi, '8.80% p.a.', 'As per gold value', 'As applicable', 'https://bankofindia.co.in/'),
    offer(L.canara, '9.25% p.a.', 'As per gold value', 'As applicable', 'https://canarabank.com/'),
    offer(L.pnb, '9.25% p.a.', 'As per gold value', 'As applicable', 'https://www.pnbindia.in/'),
    offer(L.rupeek, '8.88% p.a.', 'As per gold value', 'As applicable', 'https://rupeek.com/'),
    offer(L.iifl, '11.88% p.a.', 'As per gold value', 'As applicable', 'https://www.iifl.com/'),
    offer(L.bajaj, '9.50% p.a.', 'As per gold value', 'As applicable', 'https://www.bajajfinserv.in/gold-loan'),
    offer(L.icici, '10.00% p.a.', 'As per gold value', 'As applicable', 'https://www.icicibank.com/personal-banking/loans/gold-loan'),
    offer(L.axis, '17.00% p.a.', 'As per gold value', 'As applicable', 'https://www.axisbank.com/retail/loans/gold-loan'),
    offer(L.hdfc, '9.30% p.a.', 'As per gold value', 'As applicable', 'https://www.hdfcbank.com/personal/borrow/popular-loans/gold-loan'),
  ],
  education: [
    offer(L.sbi, '8.50% p.a.', 'As per course', 'As applicable', 'https://sbi.co.in/web/personal-banking/loans/education-loans'),
    offer(L.hdfc, '9.00% p.a.', 'As per course', 'As applicable', 'https://www.hdfcbank.com/personal/borrow/popular-loans/educational-loan'),
    offer(L.axis, '9.25% p.a.', 'As per course', 'As applicable', 'https://www.axisbank.com/retail/loans/education-loan'),
    offer(L.icici, '9.50% p.a.', 'As per course', 'As applicable', 'https://www.icicibank.com/personal-banking/loans/education-loan'),
    offer(L.boi, '8.85% p.a.', 'As per course', 'As applicable', 'https://bankofindia.co.in/'),
    offer(L.canara, '8.60% p.a.', 'As per course', 'As applicable', 'https://canarabank.com/'),
    offer(L.pnb, '8.70% p.a.', 'As per course', 'As applicable', 'https://www.pnbindia.in/'),
  ],
  car: [
    offer(L.hdfc, '8.70% p.a.', 'Up to 100% on-road', 'As applicable', 'https://www.hdfcbank.com/personal/borrow/popular-loans/new-car-loan'),
    offer(L.icici, '8.90% p.a.', 'Up to 100% on-road', 'As applicable', 'https://www.icicibank.com/personal-banking/loans/car-loan'),
    offer(L.axis, '9.00% p.a.', 'Up to 100% on-road', 'As applicable', 'https://www.axisbank.com/retail/loans/car-loan'),
    offer(L.kotak, '9.10% p.a.', 'Up to 100% on-road', 'As applicable', 'https://www.kotak.com/en/personal-banking/loans/car-loan.html'),
    offer(L.sbi, '8.85% p.a.', 'Up to 90% on-road', 'As applicable', 'https://sbi.co.in/web/personal-banking/loans/personal-loans/car-loans'),
    offer(L.idfc, '9.25% p.a.', 'Up to 100% on-road', 'As applicable', 'https://www.idfcfirstbank.com/personal-banking/loans/car-loan'),
    offer(L.bajaj, '9.50% p.a.', 'Up to 100% on-road', 'As applicable', 'https://www.bajajfinserv.in/car-loan'),
  ],
  lap: [
    offer(L.hdfc, '9.50% p.a.', 'As per property value', 'As applicable', 'https://www.hdfcbank.com/personal/borrow/popular-loans/loan-against-property'),
    offer(L.icici, '9.75% p.a.', 'As per property value', 'As applicable', 'https://www.icicibank.com/personal-banking/loans/loan-against-property'),
    offer(L.axis, '9.90% p.a.', 'As per property value', 'As applicable', 'https://www.axisbank.com/retail/loans/loan-against-property'),
    offer(L.kotak, '10.00% p.a.', 'As per property value', 'As applicable', 'https://www.kotak.com/en/personal-banking/loans/loan-against-property.html'),
    offer(L.bajaj, '10.00% p.a.', 'As per property value', 'As applicable', 'https://www.bajajfinserv.in/loan-against-property'),
    offer(L.hdb, '10.50% p.a.', 'As per property value', 'As applicable', 'https://www.hdbfs.com/products/loans-against-property-and-machinery'),
    offer(L.tata, '10.25% p.a.', 'As per property value', 'As applicable', 'https://www.tatacapital.com/loan-against-property.html'),
    offer(L.sbi, '9.65% p.a.', 'As per property value', 'As applicable', 'https://sbi.co.in/web/personal-banking/loans'),
  ],
} as const;

const DEFAULT_HIGHLIGHTS = [
  'Compare partner lenders for this product',
  'Rates and limits shown are indicative',
  'Apply on the lender’s official website',
];
const DEFAULT_ELIGIBILITY = [
  'Valid KYC documents',
  'Stable income / business proof as required by lender',
  'Age and credit criteria vary by bank',
];
const DEFAULT_DOCUMENTS = [
  'KYC (PAN, Aadhaar / other ID)',
  'Income / bank statements',
  'Additional papers as requested by the lender',
];

function product(
  partial: Omit<LoanProduct, 'highlights' | 'eligibility' | 'documents'> & {
    highlights?: string[];
    eligibility?: string[];
    documents?: string[];
  },
): LoanProduct {
  return {
    highlights: partial.highlights ?? DEFAULT_HIGHLIGHTS,
    eligibility: partial.eligibility ?? DEFAULT_ELIGIBILITY,
    documents: partial.documents ?? DEFAULT_DOCUMENTS,
    ...partial,
  };
}

export const PARTNER_CATEGORIES: PartnerCategory[] = [
  {
    id: 'loans',
    title: 'Loans',
    blurb: 'Compare loans from partner banks and NBFCs, then apply on the lender site.',
    path: 'loans',
  },
  {
    id: 'advisors',
    title: 'CPAs & Tax Advisors',
    blurb:
      'Connect with verified CPAs and tax advisors for bookkeeping, tax filing, and financial planning.',
    path: 'advisors',
  },
];

export const LOAN_PRODUCTS: LoanProduct[] = [
  product({
    id: 'business-loan',
    name: 'Business Loan',
    tagline: 'Unsecured funding for working capital, expansion, and day-to-day needs.',
    amountRange: '₹50,000 – ₹1 crore',
    rateFrom: '10.75% p.a. onwards',
    tenure: '12 – 60 months',
    banks: [...BANKS.business],
  }),
  product({
    id: 'working-capital',
    name: 'Working Capital Loan',
    tagline: 'Short-term credit to smooth cash gaps, inventory, and payroll.',
    amountRange: '₹1 lakh – ₹75 lakh',
    rateFrom: '11% p.a. onwards',
    tenure: '6 – 36 months',
    banks: [...BANKS.workingCapital],
  }),
  product({
    id: 'machinery-loan',
    name: 'Machinery Loan',
    tagline: 'Finance equipment and machinery for growth or replacement.',
    amountRange: '₹2 lakh – ₹2 crore',
    rateFrom: '9.5% p.a. onwards',
    tenure: '12 – 84 months',
    banks: [...BANKS.machinery],
  }),
  product({
    id: 'msme-shopkeeper',
    name: 'MSME / Shopkeeper Loan',
    tagline: 'Collateral-light options for shops, traders, and small manufacturers.',
    amountRange: '₹50,000 – ₹50 lakh',
    rateFrom: '12% p.a. onwards',
    tenure: '12 – 48 months',
    banks: [...BANKS.msme],
  }),
  product({
    id: 'personal-loan',
    name: 'Personal Loan',
    tagline: 'Unsecured personal funding for short-term needs.',
    amountRange: '₹50,000 – ₹40 lakh',
    rateFrom: '9.99% p.a. onwards',
    tenure: '12 – 60 months',
    banks: [...BANKS.personal],
  }),
  product({
    id: 'personal-loan-salaried',
    name: 'Personal Loan for Salaried',
    tagline: 'Personal loans tailored for salaried professionals.',
    amountRange: '₹50,000 – ₹40 lakh',
    rateFrom: '9.99% p.a. onwards',
    tenure: '12 – 60 months',
    banks: [...BANKS.personal],
  }),
  product({
    id: 'personal-loan-self-employed',
    name: 'Personal Loan for Self Employed',
    tagline: 'Personal loans for self-employed professionals and business owners.',
    amountRange: '₹1 lakh – ₹30 lakh',
    rateFrom: '10.99% p.a. onwards',
    tenure: '12 – 48 months',
    banks: [...BANKS.personal],
  }),
  product({
    id: 'personal-loan-instant',
    name: 'Instant Personal Loan',
    tagline: 'Faster digital personal loan journeys from partner lenders.',
    amountRange: '₹25,000 – ₹25 lakh',
    rateFrom: '10.00% p.a. onwards',
    tenure: '6 – 48 months',
    banks: [...BANKS.personal],
  }),
  product({
    id: 'home-loan',
    name: 'Home Loan',
    tagline: 'Finance your home purchase with partner banks.',
    amountRange: '₹5 lakh – ₹10 crore',
    rateFrom: '8.35% p.a. onwards',
    tenure: 'Up to 30 years',
    banks: [...BANKS.home],
  }),
  product({
    id: 'home-loan-balance-transfer',
    name: 'Home Loan Balance Transfer',
    tagline: 'Move your existing home loan for a better rate.',
    amountRange: 'As per outstanding',
    rateFrom: '8.40% p.a. onwards',
    tenure: 'Remaining tenure',
    banks: [...BANKS.home],
  }),
  product({
    id: 'home-loan-self-employed',
    name: 'Home Loan for Self Employed',
    tagline: 'Home loans designed for self-employed borrowers.',
    amountRange: '₹5 lakh – ₹5 crore',
    rateFrom: '8.60% p.a. onwards',
    tenure: 'Up to 25 years',
    banks: [...BANKS.home],
  }),
  product({
    id: 'home-loan-women',
    name: 'Home Loan for Women',
    tagline: 'Preferential home-loan options for women applicants.',
    amountRange: '₹5 lakh – ₹5 crore',
    rateFrom: '8.35% p.a. onwards',
    tenure: 'Up to 30 years',
    banks: [...BANKS.home],
  }),
  product({
    id: 'home-renovation-loan',
    name: 'Home Renovation Loan',
    tagline: 'Fund repairs and renovation of your home.',
    amountRange: '₹1 lakh – ₹50 lakh',
    rateFrom: '9.00% p.a. onwards',
    tenure: 'Up to 15 years',
    banks: [...BANKS.home],
  }),
  product({
    id: 'plot-loan',
    name: 'Plot Loan',
    tagline: 'Finance purchase of a residential plot.',
    amountRange: '₹5 lakh – ₹3 crore',
    rateFrom: '8.90% p.a. onwards',
    tenure: 'Up to 15 years',
    banks: [...BANKS.home],
  }),
  product({
    id: 'home-loan-nri',
    name: 'NRI Home Loan',
    tagline: 'Home loans for NRIs buying property in India.',
    amountRange: '₹10 lakh – ₹10 crore',
    rateFrom: '8.70% p.a. onwards',
    tenure: 'Up to 25 years',
    banks: [...BANKS.home],
  }),
  product({
    id: 'gold-loan',
    name: 'Gold Loan',
    tagline: 'Quick loans against gold jewellery.',
    amountRange: '₹10,000 – ₹50 lakh',
    rateFrom: '8.75% p.a. onwards',
    tenure: '6 – 36 months',
    banks: [...BANKS.gold],
  }),
  product({
    id: 'education-loan',
    name: 'Education Loan',
    tagline: 'Fund higher studies in India or abroad.',
    amountRange: '₹50,000 – ₹1.5 crore',
    rateFrom: '8.50% p.a. onwards',
    tenure: 'Up to 15 years',
    banks: [...BANKS.education],
  }),
  product({
    id: 'car-loan',
    name: 'Car Loan',
    tagline: 'Finance a new or used car from partner banks.',
    amountRange: '₹1 lakh – ₹1 crore',
    rateFrom: '8.70% p.a. onwards',
    tenure: '12 – 84 months',
    banks: [...BANKS.car],
  }),
  product({
    id: 'loan-against-property',
    name: 'Loan Against Property',
    tagline: 'Unlock liquidity against residential or commercial property.',
    amountRange: '₹10 lakh – ₹10 crore',
    rateFrom: '9.50% p.a. onwards',
    tenure: 'Up to 15 years',
    banks: [...BANKS.lap],
  }),
];

export function getLoanProduct(id: string): LoanProduct | undefined {
  return LOAN_PRODUCTS.find((p) => p.id === id);
}
