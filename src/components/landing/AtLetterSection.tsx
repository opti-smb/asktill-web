import styles from './landingV2.module.css';

const CHECKS = [
  {
    title: 'Delivered every month',
    desc: 'Auto-generated after each statement upload.',
  },
  {
    title: 'Written for owners, not accountants',
    desc: 'No formulas, no ratios. Just what it means for you.',
  },
  {
    title: 'One thing to act on',
    desc: 'Every letter ends with one specific recommendation.',
  },
  {
    title: 'Shareable with your CPA',
    desc: 'Download as PDF or forward from your inbox.',
  },
];

export default function AtLetterSection() {
  return (
    <section className={styles.letterSection} id="at-letter">
      <div className="wrap">
        <div className={styles.lbl}>The AT Letter</div>
        <div className={styles.letterGrid}>
          <div>
            <h2 className={styles.h2}>Your finances in plain English. Every month.</h2>
            <p className={styles.bodyLg} style={{ marginBottom: 32 }}>
              No dashboards to interpret. No jargon. A clear, honest monthly summary — and one thing
              to act on.
            </p>
            <div className={styles.letterChecks}>
              {CHECKS.map((item) => (
                <div key={item.title} className={styles.lcheck}>
                  <div className={styles.ic} style={{ marginTop: 2 }}>
                    <i className="ti ti-check" aria-hidden="true" />
                  </div>
                  <div>
                    <div className={styles.lcheckTitle}>{item.title}</div>
                    <div className={styles.lcheckDesc}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <a href="#at-letter" className={styles.btnP}>
              See a sample letter →
            </a>
          </div>

          <div className={styles.letterCard}>
            <div className={styles.letterHead}>
              <div className={styles.letterLogo}>
                <div className={styles.letterLogoIcon}>
                  <i className="ti ti-chart-bar" aria-hidden="true" />
                </div>
                <div className={styles.letterLogoText}>
                  ask<span>till</span>
                </div>
              </div>
              <span className={styles.letterDate}>May 2026 · AT Letter</span>
            </div>
            <div className={styles.letterBody}>
              <p className={styles.letterGreeting}>Hi Sarah,</p>
              <p className={styles.letterPara}>Here&apos;s your April in plain English.</p>
              <div className={styles.statGrid}>
                <div className={styles.statBox}>
                  <div className={styles.statLbl}>Brought in</div>
                  <div className={styles.statVal}>$28,400</div>
                </div>
                <div className={styles.statBox}>
                  <div className={styles.statLbl}>Spent</div>
                  <div className={styles.statVal}>$24,100</div>
                </div>
                <div className={styles.statBox}>
                  <div className={styles.statLbl}>Kept</div>
                  <div className={styles.statVal}>$4,300</div>
                </div>
              </div>
              <p className={styles.letterPara}>
                That&apos;s your <strong style={{ fontWeight: 600 }}>best month in 6 months.</strong>{' '}
                Revenue up 11% and operating costs stayed flat — that&apos;s exactly what healthy
                growth looks like.
              </p>
              <div className={styles.calloutRed}>
                <div className={styles.calloutRedTitle}>One thing to watch</div>
                <p>
                  Card processing fees up $340 this month. Call your processor — you may be on an
                  old rate plan.
                </p>
              </div>
              <div className={styles.calloutBlue}>
                <div className={styles.calloutBlueTitle}>This month&apos;s one action</div>
                <p>
                  3 unused subscriptions = $290/mo. Cancel them → $3,480/yr back in your pocket.
                </p>
              </div>
              <p className={styles.letterPara} style={{ marginBottom: 3 }}>
                You&apos;re on track. Keep going.
              </p>
              <p className={styles.letterSign}>— Asktill</p>
              <div className={styles.letterFooter}>
                <span>April 2026 · Bakery &amp; Café, Austin TX</span>
                <div className={styles.letterFooterBtns}>
                  <button type="button">Download PDF</button>
                  <button type="button">Forward</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
