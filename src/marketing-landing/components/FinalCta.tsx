import { FadeUp } from "./FadeUp";
import SectionMotion from "./SectionMotion";
import styles from "./FinalCta.module.css";

/** Final CTA + footer in one slide (client asktill-06-final-footer-v2). */
export default function FinalCta() {
  const year = new Date().getFullYear();

  return (
    <section className={styles.section} id="cta">
      <SectionMotion kind="cta" />
      <div className={`wrap ${styles.stack}`}>
        <FadeUp className={styles.finalCard}>
          <span className={styles.blob1} aria-hidden="true" />
          <span className={styles.blob2} aria-hidden="true" />
          <span className={styles.blob3} aria-hidden="true" />
          <div className={styles.finalInner}>
            <p className={styles.kicker}>Before you go</p>
            <h2>The money&apos;s already yours. We help you keep it.</h2>
            <p className={styles.lead}>
              Missed payments, quiet fees, lost disputes — it adds up fast.
              AskTill finds it, flags it, and fights for it, so more of what you
              earned actually stays with you.
            </p>
            <div className={styles.actions}>
              <a className={styles.btnPrimary} href={`/login`}>
                Get started free
              </a>
              <a className={styles.btnSecondary} href="#how">
                See how it works
              </a>
            </div>
            <p className={styles.note}>
              No card needed to start ·{" "}
              <strong>You only pay on chargebacks we win.</strong>
            </p>
          </div>
        </FadeUp>

        <div className={styles.footTop}>
          <div className={styles.footGrid}>
            <div className={styles.footBrand}>
              <div className={styles.brand}>
                <span className={styles.brandMark}>AT</span>
                AskTill
              </div>
              <p>Financial clarity for small businesses.</p>
            </div>

            <div className={styles.footCols}>
              <div className={`${styles.footCol} ${styles.c1}`}>
                <h5>Product</h5>
                <a href="#how">How it works</a>
                <a href="#features">Features</a>
                <a href="#pricing">Pricing</a>
              </div>
              <div className={`${styles.footCol} ${styles.c2}`}>
                <h5>App</h5>
                <a href={`/login`}>Log in</a>
                <a href={`/login`}>Get started</a>
                <a href="#trust">Security</a>
              </div>
              <div className={`${styles.footCol} ${styles.c3}`}>
                <h5>Company</h5>
                <a href="#top">About</a>
                <a href="#cta">Contact</a>
                <a href="#cta">Support</a>
              </div>
            </div>
          </div>

          <div className={styles.copyright}>
            <span>© {year} AskTill. All rights reserved.</span>
            <span className={styles.legal}>
              <a href="#trust">Privacy</a>
              <a href="#trust">Terms</a>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
