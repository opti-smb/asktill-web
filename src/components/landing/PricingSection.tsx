import PlanGrid from '../pricing/PlanGrid';
import styles from './landingV2.module.css';

export default function PricingSection() {
  return (
    <section className={styles.sec} id="pricing">
      <div className="wrap">
        <div className={styles.lbl}>Pricing</div>
        <h2 className={styles.h2}>Simple, transparent pricing</h2>
        <p className={styles.bodyLg} style={{ marginBottom: 32 }}>
          All plans include the AT Letter and AT Rewards on every analysis.
        </p>
        <PlanGrid variant="landing" />
      </div>
    </section>
  );
}
