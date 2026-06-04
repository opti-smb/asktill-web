import styles from './landingV2.module.css';

const STEPS = [
  {
    icon: 'ti-upload',
    title: 'Upload',
    badge: 'No storage',
    desc: 'PDF, CSV, or image from any US bank.',
  },
  {
    icon: 'ti-cpu',
    title: 'Analyze',
    desc: 'Cash flow, risk signals, and trends in ~30s.',
  },
  {
    icon: 'ti-mail',
    title: 'Get your AT Letter',
    desc: 'Plain-English monthly summary, just for you.',
  },
  {
    icon: 'ti-award',
    title: 'Earn AT Rewards',
    desc: 'Points on every upload and every product.',
  },
];

export default function HowItWorks() {
  return (
    <section className={styles.sec} id="how-it-works">
      <div className="wrap">
        <div className={styles.lbl}>How it works</div>
        <h2 className={styles.h2}>Four steps to clarity</h2>
        <p className={styles.bodyLg} style={{ maxWidth: 420 }}>
          No integrations. No setup. Upload and get your report.
        </p>
        <div className={styles.stepsGrid}>
          {STEPS.map((step) => (
            <div key={step.title} className={styles.stepCell}>
              <div className={`${styles.ic} ${styles.stepIconWrap}`}>
                <i className={`ti ${step.icon}`} aria-hidden="true" />
              </div>
              <div className={styles.stepTitle}>
                {step.title}
                {step.badge ? <span className={styles.badge}>{step.badge}</span> : null}
              </div>
              <div className={styles.stepDesc}>{step.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
