import styles from "./ProductScreens.module.css";

export function CashflowScreen() {
  return (
    <div className={`${styles.screen} ${styles.cash}`}>
      <header className={styles.top}>
        <span>Cash position</span>
        <strong>Mar 2026</strong>
      </header>
      <p className={styles.big}>$24,180</p>
      <p className={styles.delta}>+12.4% vs last month</p>
      <div className={styles.chart}>
        {[42, 58, 51, 72, 64, 88, 76].map((h, i) => (
          <span key={i} style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className={styles.row}>
        <span>Bank matched</span>
        <b>96%</b>
      </div>
      <div className={styles.row}>
        <span>POS deposits</span>
        <b>$18.2k</b>
      </div>
      <div className={styles.row}>
        <span>Ecommerce</span>
        <b>$5.9k</b>
      </div>
    </div>
  );
}

export function RiskScreen() {
  return (
    <div className={`${styles.screen} ${styles.risk}`}>
      <header className={styles.top}>
        <span>Risk signals</span>
        <strong>Live</strong>
      </header>
      <div className={styles.gauge}>
        <div className={styles.gaugeRing} />
        <div className={styles.gaugeLabel}>
          <b>Low</b>
          <span>score 22</span>
        </div>
      </div>
      <div className={`${styles.alert} ${styles.warn}`}>
        <span>Fee spike</span>
        <b>+18% Stripe fees</b>
      </div>
      <div className={`${styles.alert} ${styles.ok}`}>
        <span>Payout lag</span>
        <b>Normal</b>
      </div>
      <div className={`${styles.alert} ${styles.warn}`}>
        <span>Gap</span>
        <b>1 unmatched deposit</b>
      </div>
    </div>
  );
}

export function LetterScreen() {
  return (
    <div className={`${styles.screen} ${styles.letter}`}>
      <header className={styles.top}>
        <span>AT Letter</span>
        <strong>Ready</strong>
      </header>
      <div className={styles.paper}>
        <p className={styles.paperTitle}>March in plain English</p>
        <p>
          Sales held steady. Cash rose $2.4k. Watch processor fees — they climbed
          faster than revenue this month.
        </p>
        <div className={styles.kpi}>
          <div>
            <span>In</span>
            <b>$42.1k</b>
          </div>
          <div>
            <span>Out</span>
            <b>$39.7k</b>
          </div>
        </div>
      </div>
      <button type="button" className={styles.fakeBtn}>
        Download PDF
      </button>
    </div>
  );
}

export function AskScreen() {
  return (
    <div className={`${styles.screen} ${styles.ask}`}>
      <header className={styles.top}>
        <span>Ask anything</span>
        <strong>AI</strong>
      </header>
      <div className={styles.chat}>
        <div className={styles.bubbleUser}>Why was February cash lower?</div>
        <div className={styles.bubbleAi}>
          Two POS batches settled late (Feb 28 → Mar 2), and refunds were $1.1k
          higher than January.
        </div>
        <div className={styles.bubbleUser}>Show unmatched deposits</div>
        <div className={styles.bubbleAi}>1 open item: $842 Square payout — likely clearing tomorrow.</div>
      </div>
    </div>
  );
}
