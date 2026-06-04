import styles from './landingV2.module.css';

const EARN = [
  { icon: 'ti-upload', title: 'Upload a statement', pts: '50–150 pts' },
  { icon: 'ti-shopping-bag', title: 'Get a partner product', pts: '200–1,000 pts' },
  { icon: 'ti-users', title: 'Refer a business', pts: '1,000 pts' },
  { icon: 'ti-repeat', title: 'Monthly streak', pts: '200 pts' },
];

const REDEEM = [
  { icon: 'ti-chart-bar', title: 'Extra analyses', pts: '500 pts' },
  { icon: 'ti-briefcase', title: 'CFO consultation', pts: '3,000 pts' },
  { icon: 'ti-discount', title: 'Partner discounts', pts: 'from 500 pts' },
  { icon: 'ti-heart', title: 'Charity / ESG', pts: '1,000 pts = $10' },
];

export default function RewardsSection() {
  return (
    <section className={styles.rewardsSection} id="rewards">
      <div className="wrap">
        <div className={styles.lbl}>AT Rewards</div>
        <div className={styles.rewardsHeader}>
          <div>
            <h2 className={styles.h2}>Earn points. Unlock more.</h2>
            <p className={styles.bodyLg} style={{ maxWidth: 380 }}>
              Points for every analysis, every partner product, and every referral.
            </p>
          </div>
          <div className={styles.rewardsStats}>
            <div className={styles.rstat}>
              <div className={styles.rstatLbl}>Per analysis</div>
              <div className={styles.rstatVal}>50–150 pts</div>
            </div>
            <div className={styles.rstat}>
              <div className={styles.rstatLbl}>Per product</div>
              <div className={styles.rstatVal}>200–1,000 pts</div>
            </div>
            <div className={styles.rstat}>
              <div className={styles.rstatLbl}>Redemption</div>
              <div className={styles.rstatVal}>100 pts = $1</div>
            </div>
          </div>
        </div>
        <div className={styles.rowsLabel}>Ways to earn</div>
        <div className={styles.rowsGrid}>
          {EARN.map((row) => (
            <div key={row.title} className={styles.rowCard}>
              <div className={styles.ic}>
                <i className={`ti ${row.icon}`} aria-hidden="true" />
              </div>
              <div>
                <div className={styles.rowCardTitle}>{row.title}</div>
                <div className={styles.rowCardPts}>{row.pts}</div>
              </div>
            </div>
          ))}
        </div>
        <div className={styles.rowsLabel}>Ways to redeem</div>
        <div className={styles.rowsGrid}>
          {REDEEM.map((row) => (
            <div key={row.title} className={styles.rowCard}>
              <div className={styles.ic}>
                <i className={`ti ${row.icon}`} aria-hidden="true" />
              </div>
              <div>
                <div className={styles.rowCardTitle}>{row.title}</div>
                <div className={styles.rowCardPts}>{row.pts}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
