import { FadeUp } from "./FadeUp";
import SectionMotion from "./SectionMotion";
import styles from "./FinalCta.module.css";

export default function FinalCta() {
  return (
    <section className={styles.section} id="cta">
      <SectionMotion kind="cta" />
      <div className={`wrap ${styles.panel}`}>
        <FadeUp className={styles.content}>
          <p className={styles.kicker}>Before you go</p>
          <h2>
            The money&apos;s already yours.
            <span>We help you keep it.</span>
          </h2>
          <p className={styles.lead}>
            Missed payments, quiet fees, lost disputes — it adds up fast. AskTill
            finds it, flags it, and fights for it, so more of what you earned
            actually stays with you.
          </p>
          <div className={styles.actions}>
            <a className="btn btn-primary" href={`/login`}>
              Get started free
            </a>
            <a className="btn btn-secondary" href="#how">
              See how it works
            </a>
          </div>
          <p className={styles.note}>
            No card needed to start ·{" "}
            <strong>You only pay on chargebacks we win.</strong>
          </p>
        </FadeUp>
      </div>
    </section>
  );
}
