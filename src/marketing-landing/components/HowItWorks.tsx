import { FadeUp } from "./FadeUp";
import SectionMotion from "./SectionMotion";
import styles from "./HowItWorks.module.css";

const STEPS = [
  {
    n: "01",
    title: "Connect your accounts",
    desc: "Link your bank, your POS, and your online store. A few minutes, and you only do it once.",
    tint: "mint",
  },
  {
    n: "02",
    title: "We match everything for you",
    desc: "Every sale checked against every deposit — automatically, every day. No manual checking.",
    tint: "sky",
  },
  {
    n: "03",
    title: "You see the full picture",
    desc: "Missing payments, real fees, and disputes — all in one place. Chargebacks fought for you, and you only pay when we win.",
    tint: "amber",
  },
];

export default function HowItWorks() {
  return (
    <section className={styles.section} id="how">
      <SectionMotion kind="how" />
      <div className={`wrap ${styles.content}`}>
        <FadeUp>
          <div className="section-head">
            <p className="section-label">How it works</p>
            <h2 className="section-title">Three steps. No spreadsheets.</h2>
            <p className="section-lead">
              You connect once. AskTill does the matching, every day, automatically.
            </p>
          </div>
        </FadeUp>

        <div className={styles.grid}>
          {STEPS.map((step) => (
            <article key={step.n} className={`${styles.card} ${styles[step.tint]}`}>
              <span className={styles.num}>{step.n}</span>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
