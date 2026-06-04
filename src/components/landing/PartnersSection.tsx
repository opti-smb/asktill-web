import styles from './landingV2.module.css';

const PARTNERS = [
  {
    icon: 'ti-credit-card',
    name: 'Credit cards',
    desc: 'Business cards with rewards and cashback for SMBs.',
    pts: '+ 500 AT pts on signup',
  },
  {
    icon: 'ti-building-bank',
    name: 'Loans',
    desc: 'SMB lending with fast approvals and competitive rates.',
    pts: '+ 1,000 AT pts on approval',
  },
  {
    icon: 'ti-device-tablet',
    name: 'Point of sale',
    desc: 'POS systems for retail, food, and service businesses.',
    pts: '+ 400 AT pts on signup',
  },
  {
    icon: 'ti-shopping-cart',
    name: 'E-commerce',
    desc: 'Shopify, WooCommerce — launch your online store.',
    pts: '+ 300 AT pts on signup',
  },
  {
    icon: 'ti-arrows-exchange',
    name: 'Payment solutions',
    desc: 'Stripe, Square — processors for growing businesses.',
    pts: '+ 300 AT pts on signup',
  },
  {
    icon: 'ti-calculator',
    name: 'CPAs',
    desc: 'Vetted accountants who specialize in small business.',
    pts: '+ 400 AT pts on engagement',
  },
  {
    icon: 'ti-shield-check',
    name: 'Insurance',
    desc: 'Business insurance — liability, E&O, and more.',
    pts: '+ 400 AT pts on policy',
  },
];

export default function PartnersSection() {
  return (
    <section className={styles.sec} id="partners">
      <div className="wrap">
        <div className={styles.lbl}>Partner services</div>
        <h2 className={styles.h2}>Everything your business needs</h2>
        <p className={styles.bodyLg} style={{ marginBottom: 32, maxWidth: 500 }}>
          Vetted partners across seven categories. Earn AT Rewards points when you sign up.
        </p>
        <div className={styles.partnersGrid}>
          {PARTNERS.map((partner) => (
            <div key={partner.name} className={styles.partnerCard}>
              <div className={styles.partnerHead}>
                <div className={styles.ic}>
                  <i className={`ti ${partner.icon}`} aria-hidden="true" />
                </div>
                <div className={styles.partnerName}>{partner.name}</div>
              </div>
              <div className={styles.partnerDesc}>{partner.desc}</div>
              <div className={styles.partnerPts}>{partner.pts}</div>
            </div>
          ))}
        </div>
        <div className={styles.partnerCtaBar}>
          <div>
            <div className={styles.partnerCtaTitle}>Are you a service provider?</div>
            <div className={styles.partnerCtaSub}>
              Join the Asktill network and reach 5,000+ financially-aware SMBs.
            </div>
          </div>
          <button type="button" className={styles.btnP} style={{ fontSize: 14 }}>
            Apply to partner →
          </button>
        </div>
      </div>
    </section>
  );
}
