import { motion, useReducedMotion } from "framer-motion";
import { FadeUp } from "./FadeUp";
import SectionMotion from "./SectionMotion";
import styles from "./Pricing.module.css";

/** Same plans as asktill-web/src/lib/plans.ts */
const PLANS = [
  {
    name: "Free",
    price: "$0",
    note: "forever",
    perks: [
      "1 statement month on file",
      "AT Letter included",
      "50 pts each",
    ],
    cta: "Get started",
    featured: false,
  },
  {
    name: "Growth",
    price: "$20",
    note: "per month",
    perks: [
      "Multi-month uploads",
      "AT Letter + benchmarks",
      "100 pts + 500 bonus",
    ],
    cta: "Get Growth",
    featured: true,
  },
];

export default function Pricing() {
  const reduce = useReducedMotion();

  return (
    <section className={styles.section} id="pricing">
      <SectionMotion kind="pricing" />
      <div className="wrap">
        <FadeUp>
          <div className="section-head">
            <p className="section-label">Pricing</p>
            <h2 className="section-title">Simple, transparent pricing</h2>
            <p className="section-lead">
              All plans include the AT Letter and AT Rewards on every analysis.
            </p>
          </div>
        </FadeUp>

        <div className={styles.grid}>
          {PLANS.map((plan, i) => (
            <motion.article
              key={plan.name}
              className={`${styles.card} ${plan.featured ? styles.featured : ""}`}
              initial={false}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: 0.45,
                delay: 0.08 * i,
                ease: [0.16, 1, 0.3, 1],
              }}
              whileHover={
                reduce
                  ? undefined
                  : {
                      y: -6,
                      scale: 1.015,
                      transition: { duration: 0.22 },
                    }
              }
            >
              {plan.featured ? (
                <motion.span
                  className={styles.badge}
                  animate={reduce ? undefined : { scale: [1, 1.05, 1] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                >
                  Most popular
                </motion.span>
              ) : null}

              <h3>{plan.name}</h3>

              <div className={styles.priceBlock}>
                <p className={styles.price}>{plan.price}</p>
                <p className={styles.note}>{plan.note}</p>
              </div>

              <ul>
                {plan.perks.map((perk, pi) => (
                  <motion.li
                    key={perk}
                    initial={reduce ? false : { opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: false, amount: 0.3 }}
                    transition={{ delay: 0.18 + i * 0.08 + pi * 0.06, duration: 0.35 }}
                  >
                    {perk}
                  </motion.li>
                ))}
              </ul>

              <motion.a
                className={`btn ${plan.featured ? "btn-primary" : "btn-outline"} ${styles.cta}`}
                href={`/pricing`}
                whileHover={reduce ? undefined : { scale: 1.03 }}
                whileTap={reduce ? undefined : { scale: 0.98 }}
              >
                {plan.cta}
              </motion.a>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
