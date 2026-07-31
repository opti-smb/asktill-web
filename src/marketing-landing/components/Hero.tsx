import { motion, useReducedMotion } from "framer-motion";
import HeroThinking from "./HeroThinking";
import SectionMotion from "./SectionMotion";
import styles from "./Hero.module.css";

export default function Hero() {
  const reduce = useReducedMotion();
  /* Paint immediately — never start near opacity 0 (looks like an empty void). */
  const enter = reduce
    ? false
    : { opacity: 1, y: 0 };

  return (
    <section className={styles.hero} id="top" aria-labelledby="hero-title">
      <div className={styles.mesh} aria-hidden="true">
        <span className={styles.meshA} />
        <span className={styles.meshB} />
        <span className={styles.meshC} />
      </div>

      <div className={styles.veil} aria-hidden="true" />
      <SectionMotion kind="hero" />

      <div className={`wrap ${styles.layout}`}>
        <div className={styles.content}>
          <motion.p
            className={styles.kicker}
            initial={enter}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            Now live
          </motion.p>

          <motion.h1
            id="hero-title"
            className={styles.title}
            initial={enter}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.02 }}
          >
            <span className={styles.headline}>
              You <span className={styles.headlineAccent}>made</span> the sale.
            </span>
            <span className={styles.headline}>Make sure you got paid.</span>
          </motion.h1>

          <motion.p
            className={styles.lead}
            initial={enter}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.04 }}
          >
            <span>
              AskTill matches your bank statement to your POS and online orders —
              automatically. So you always know what you earned, what you kept,
              and what&apos;s still owed.
            </span>
          </motion.p>

          <motion.ul
            className={styles.trustRow}
            initial={enter}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.06 }}
          >
            <li>
              Catch every missing payment — we spot any sale that didn&apos;t
              reach your bank.
            </li>
            <li>
              See what getting paid really costs — every fee, on every payment,
              no guessing.
            </li>
            <li>
              We handle your chargebacks — we fight to win your money back, and
              you only pay when we do.
            </li>
          </motion.ul>

          <motion.div
            className={styles.ctas}
            initial={enter}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 }}
          >
            <a className="btn btn-primary" href={`/login`}>
              Get started free
            </a>
            <a className="btn btn-secondary" href="#how">
              See how it works
            </a>
            <span className={styles.lead}>
              <span>No card needed. Set up in minutes.</span>
            </span>
          </motion.div>
        </div>

        <div className={styles.visual}>
          <HeroThinking />
        </div>
      </div>
    </section>
  );
}
