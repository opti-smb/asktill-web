/** Keep in sync with Registration-Service/services/registration_roles.py */

export const REGISTRATION_ROLE_GROUPS = [
  {
    label: 'Business leadership',
    roles: [
      'Owner / Founder',
      'Co-owner / Partner',
      'CEO / President',
      'General Manager',
      'Franchise Owner',
    ],
  },
  {
    label: 'Finance & accounting',
    roles: [
      'CFO',
      'Controller',
      'Finance Manager',
      'Accountant',
      'Bookkeeper',
      'Accounts Payable / Receivable',
      'Payroll Manager',
    ],
  },
  {
    label: 'Operations & admin',
    roles: [
      'Operations Manager',
      'Store / Location Manager',
      'Office Manager',
      'Admin / Executive Assistant',
    ],
  },
  {
    label: 'Advisors & consultants',
    roles: ['CPA / Tax Advisor', 'Business Consultant', 'Fractional CFO'],
  },
  {
    label: 'Other',
    roles: ['Employee', 'Intern / Trainee', 'Other'],
  },
] as const;

export type RegistrationRole =
  (typeof REGISTRATION_ROLE_GROUPS)[number]['roles'][number];

export const REGISTRATION_ROLES: readonly RegistrationRole[] =
  REGISTRATION_ROLE_GROUPS.flatMap((group) => group.roles);
