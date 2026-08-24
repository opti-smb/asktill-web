import termsRaw from '../content/policies/terms.txt?raw';
import privacyRaw from '../content/policies/privacy.txt?raw';
import securityRaw from '../content/policies/security.txt?raw';
import vdpRaw from '../content/policies/vulnerability-disclosure.txt?raw';

export type PolicySlug =
  | 'terms'
  | 'privacy'
  | 'security'
  | 'vulnerability-disclosure';

export type PolicyDoc = {
  slug: PolicySlug;
  title: string;
  shortLabel: string;
  body: string;
};

export const POLICIES: PolicyDoc[] = [
  {
    slug: 'terms',
    title: 'Terms of Service',
    shortLabel: 'Terms of Service',
    body: termsRaw,
  },
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    shortLabel: 'Privacy Policy',
    body: privacyRaw,
  },
  {
    slug: 'security',
    title: 'Security & Trust',
    shortLabel: 'Security & Trust',
    body: securityRaw,
  },
  {
    slug: 'vulnerability-disclosure',
    title: 'Vulnerability Disclosure Policy',
    shortLabel: 'Vulnerability Disclosure',
    body: vdpRaw,
  },
];

export function getPolicy(slug: string | undefined): PolicyDoc | undefined {
  return POLICIES.find((p) => p.slug === slug);
}
