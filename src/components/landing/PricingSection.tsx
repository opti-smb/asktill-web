import { Link } from 'react-router-dom';
import styles from './landingV2.module.css';

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    items: ['3 analyses/mo', 'AT Letter included', '50 pts each'],
    highlight: '3 analyses/mo',
    cta: 'Get started',
    primary: false,
  },
  {
    name: 'Basic',
    price: '$9',
    period: 'per month',
    items: ['10 analyses/mo', 'AT Letter included', '75 pts + 200 bonus'],
    highlight: '10 analyses/mo',
    cta: 'Get Basic',
    primary: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: 'per month',
    items: ['50 analyses/mo', 'AT Letter + benchmarks', '100 pts + 500 bonus'],
    highlight: '50 analyses/mo',
    cta: 'Get Pro',
    primary: true,
    featured: true,
  },
  {
    name: 'Business',
    price: '$99',
    period: 'per month',
    items: ['Unlimited', 'AT Letter + white-label', '150 pts + 2,000 bonus'],
    highlight: 'Unlimited',
    cta: 'Get Business',
    primary: false,
  },
];

export default function PricingSection() {
  return (
    <section className={styles.sec} id="pricing">
      <div className="wrap">
        <div className={styles.lbl}>Pricing</div>
        <h2 className={styles.h2}>Simple, transparent pricing</h2>
        <p className={styles.bodyLg} style={{ marginBottom: 32 }}>
          All plans include the AT Letter and AT Rewards on every analysis.
        </p>
        <div className={styles.pricingGrid}>
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`${styles.plan} ${plan.featured ? styles.planFeatured : ''}`}
            >
              {plan.featured ? <div className={styles.planBadge}>Most popular</div> : null}
              <div className={styles.planName}>{plan.name}</div>
              <div className={styles.planPrice}>{plan.price}</div>
              <div className={styles.planPeriod}>{plan.period}</div>
              <div className={styles.planItems}>
                {plan.items.map((item) => (
                  <div key={item} className={item === plan.highlight ? styles.planHi : undefined}>
                    {item}
                  </div>
                ))}
              </div>
              <Link
                to="/register"
                className={`${plan.primary ? styles.btnP : styles.btnO} ${styles.planBtn}`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
